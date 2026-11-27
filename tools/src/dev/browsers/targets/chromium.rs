//! A Chromium-family browser (Chrome, Edge, Opera) reached over its remote debugging port.

mod extensions_page;

use std::sync::{Mutex, PoisonError};
use std::time::Duration;

use dev_hot::driver::cdp::protocol::{Method, NoParams};
use dev_hot::driver::cdp::{CdpClient, CdpTarget, TargetId, TargetKind};
use dev_hot::types::Port;
use serde_json::Value;
use tokio::time::Instant;

use self::extensions_page::evaluate_on_extensions_page;
use crate::cdp::Session;
use crate::dev::browsers::error::{BrowserError, Result};
use crate::dev::browsers::scripts;
use crate::dev::browsers::target::{BoxFuture, Reinjection, ReloadTarget};
use crate::output::reload::{ExtensionReloadPlan, PageRefreshPlan};

const SERVICE_WORKER_WAIT: Duration = Duration::from_secs(10);
const SERVICE_WORKER_POLL: Duration = Duration::from_millis(200);
const REINJECT_ATTEMPTS: u32 = 3;
const EXTENSION_URL_PREFIX: &str = "chrome-extension://";
const HTML_SUFFIX: &str = ".html";

/// A Chromium browser and the extension under development in it.
pub(crate) struct ChromiumTarget {
    port: Port,
    client: CdpClient,
    /// The manifest name, which tells the extension apart from the profile's other ones.
    extension_name: String,
    extension_id: Mutex<Option<String>>,
}

fn extension_id_of(target: &CdpTarget) -> Option<&str> {
    target
        .url
        .strip_prefix(EXTENSION_URL_PREFIX)?
        .split('/')
        .next()
}

fn is_worker_of(target: &CdpTarget, extension_id: &str) -> bool {
    target.kind == TargetKind::ServiceWorker && extension_id_of(target) == Some(extension_id)
}

fn page_name_of(url: &str) -> Option<&str> {
    let path = url.strip_prefix(EXTENSION_URL_PREFIX)?.split_once('/')?.1;
    let file = path.split(['?', '#']).next()?;
    file.strip_suffix(HTML_SUFFIX)?.rsplit('/').next()
}

/// Reloads one page target; false when no session could be opened on it or it refused.
async fn reload_page(target: &CdpTarget) -> bool {
    let Some(url) = target.debugger_url() else {
        return false;
    };
    let outcome = async {
        let mut session = Session::open(url).await?;
        let reloaded = session.call(Method::PageReload, &NoParams {}).await;
        session.close().await;
        reloaded
    }
    .await;
    if let Err(error) = &outcome {
        tracing::warn!("Could not reload {}: {error}", target.url);
    }
    outcome.is_ok()
}

impl ChromiumTarget {
    /// A target on a browser's remote debugging port, running the extension of this name.
    pub(crate) const fn new(port: Port, extension_name: String) -> Self {
        Self {
            port,
            client: CdpClient::new(port),
            extension_name,
            extension_id: Mutex::new(None),
        }
    }

    async fn resolve_extension_id(&self) -> Result<String> {
        let known = self
            .extension_id
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .clone();
        if let Some(id) = known {
            return Ok(id);
        }
        let source = scripts::extension_id_by_name(&self.extension_name)?;
        let value = evaluate_on_extensions_page(self.port, &source).await?;
        let id = value.as_str().ok_or_else(|| {
            BrowserError::Protocol(format!(
                "the browser has no extension named {}",
                self.extension_name
            ))
        })?;
        *self
            .extension_id
            .lock()
            .unwrap_or_else(PoisonError::into_inner) = Some(id.to_owned());
        Ok(id.to_owned())
    }

    async fn list_workers(&self, extension_id: &str) -> Vec<CdpTarget> {
        let targets = self.client.list_targets().await.unwrap_or_default();
        targets
            .into_iter()
            .filter(|target| is_worker_of(target, extension_id))
            .collect()
    }

    /// Waits for a worker other than the `stale` ones the reload is tearing down.
    async fn wait_for_fresh_worker(
        &self,
        extension_id: &str,
        stale: &[TargetId],
    ) -> Result<CdpTarget> {
        let deadline = Instant::now() + SERVICE_WORKER_WAIT;
        loop {
            let is_expired = Instant::now() >= deadline;
            if is_expired {
                return Err(BrowserError::Timeout("the extension's service worker"));
            }
            let workers = self.list_workers(extension_id).await;
            let fresh = workers
                .into_iter()
                .find(|worker| !stale.contains(&worker.id));
            if let Some(worker) = fresh {
                return Ok(worker);
            }
            tokio::time::sleep(SERVICE_WORKER_POLL).await;
        }
    }

    /// Always through the extensions page: `runtime.reload()` from the worker makes a branded
    /// browser disable a command-line-loaded extension as unsupported.
    async fn reload_extension_process(&self, extension_id: &str) -> Result<()> {
        let source = scripts::extension_reload(extension_id)?;
        evaluate_on_extensions_page(self.port, &source).await?;
        Ok(())
    }

    /// The fresh worker may still be starting, so its first evaluations can fail.
    async fn evaluate_in_worker(&self, worker: &CdpTarget, expression: &str) -> Result<Value> {
        let url = worker
            .debugger_url()
            .ok_or_else(|| BrowserError::Protocol("the worker has no debugger URL".to_owned()))?;
        let mut session = Session::open(url).await?;
        let outcome = session.evaluate(expression).await;
        session.close().await;
        Ok(outcome?)
    }

    async fn reload_extension_now(&self, plan: &ExtensionReloadPlan) -> Result<Reinjection> {
        let id = self.resolve_extension_id().await?;
        let stale: Vec<TargetId> = self
            .list_workers(&id)
            .await
            .into_iter()
            .map(|worker| worker.id)
            .collect();
        self.reload_extension_process(&id).await?;
        // A reload that leaves the extension disabled is undone by a second one
        let worker = if let Ok(worker) = self.wait_for_fresh_worker(&id, &stale).await {
            worker
        } else {
            self.reload_extension_process(&id).await?;
            self.wait_for_fresh_worker(&id, &stale).await?
        };
        let source = scripts::tab_reinject(plan)?;
        let value = self.reinject(&id, worker, &source).await?;
        Ok(serde_json::from_value(value)?)
    }

    /// A worker caught while it starts can leave an evaluation unanswered. Re-injecting undoes what
    /// ran before it runs again, so it is safe to ask the live worker once more.
    async fn reinject(&self, id: &str, worker: CdpTarget, source: &str) -> Result<Value> {
        let mut worker = worker;
        let mut attempt = 1;
        loop {
            let error = match self.evaluate_in_worker(&worker, source).await {
                Ok(value) => return Ok(value),
                Err(error) => error,
            };
            let is_out_of_attempts = attempt >= REINJECT_ATTEMPTS;
            if is_out_of_attempts {
                return Err(error);
            }
            tracing::warn!("Re-injecting the content scripts failed, trying again: {error}");
            attempt += 1;
            worker = self.wait_for_fresh_worker(id, &[]).await?;
        }
    }

    async fn refresh_pages_now(&self, plan: &PageRefreshPlan) -> Result<Vec<String>> {
        let prefix = format!(
            "{EXTENSION_URL_PREFIX}{}/",
            self.resolve_extension_id().await?
        );
        let is_any_page_affected = !plan.shared_asset_files.is_empty();
        let mut refreshed = Vec::new();
        for target in self.client.list_targets().await? {
            let is_unrelated = target.kind != TargetKind::Page || !target.url.starts_with(&prefix);
            if is_unrelated {
                continue;
            }
            let Some(name) = page_name_of(&target.url).map(str::to_owned) else {
                continue;
            };
            let is_affected = is_any_page_affected || plan.page_names.contains(&name);
            let is_refreshed = is_affected && reload_page(&target).await;
            if is_refreshed {
                refreshed.push(name);
            }
        }
        Ok(refreshed)
    }
}

impl ReloadTarget for ChromiumTarget {
    fn reload_extension<'a>(&'a self, plan: &'a ExtensionReloadPlan) -> BoxFuture<'a, Reinjection> {
        Box::pin(self.reload_extension_now(plan))
    }

    fn refresh_pages<'a>(&'a self, plan: &'a PageRefreshPlan) -> BoxFuture<'a, Vec<String>> {
        Box::pin(self.refresh_pages_now(plan))
    }
}

#[cfg(test)]
mod tests {
    use crate::dev::browsers::targets::chromium::*;

    fn target(kind: &str, url: &str) -> Result<CdpTarget> {
        Ok(serde_json::from_value(serde_json::json!({
            "id": url, "type": kind, "url": url, "webSocketDebuggerUrl": "ws://x"
        }))?)
    }

    #[test]
    fn the_worker_is_matched_by_its_extension_id() -> Result<()> {
        let worker = target("service_worker", "chrome-extension://abc/background.js")?;
        assert!(is_worker_of(&worker, "abc"));
        assert!(!is_worker_of(&worker, "other"));
        let page = target("page", "chrome-extension://abc/popup.html")?;
        assert!(!is_worker_of(&page, "abc"));
        Ok(())
    }

    #[test]
    fn page_names_come_from_html_paths() {
        assert_eq!(
            page_name_of("chrome-extension://id/popup.html?x=1"),
            Some("popup")
        );
        assert_eq!(page_name_of("chrome-extension://id/background.js"), None);
        assert_eq!(page_name_of("https://example.com/popup.html"), None);
    }
}
