//! A Chromium-family browser (Chrome, Edge, Opera) reached over its remote debugging port.

mod extensions_page;

use std::sync::{Mutex, PoisonError};
use std::time::Duration;

use dev_hot::driver::cdp::protocol::{Method, NoParams};
use dev_hot::driver::cdp::{CdpClient, CdpTarget, TargetId, TargetKind};
use dev_hot::types::Port;
use tokio::time::Instant;

use self::extensions_page::evaluate_on_extensions_page;
use crate::cdp::Session;
use crate::dev::browsers::error::{BrowserError, Result};
use crate::dev::browsers::scripts;
use crate::dev::browsers::target::{BoxFuture, ReloadTarget};
use crate::output::manifest::matches_url_pattern;
use crate::output::reload::{ExtensionReloadPlan, PageRefreshPlan};

const SERVICE_WORKER_WAIT: Duration = Duration::from_secs(10);
const SERVICE_WORKER_POLL: Duration = Duration::from_millis(200);
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

fn is_matching_tab(target: &CdpTarget, patterns: &[String]) -> bool {
    target.kind == TargetKind::Page
        && patterns
            .iter()
            .any(|pattern| matches_url_pattern(&target.url, pattern))
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

    async fn list_worker_ids(&self, extension_id: &str) -> Vec<TargetId> {
        let targets = self.client.list_targets().await.unwrap_or_default();
        targets
            .into_iter()
            .filter(|target| is_worker_of(target, extension_id))
            .map(|target| target.id)
            .collect()
    }

    /// Waits for a worker other than the `stale` ones the reload is tearing down.
    async fn wait_for_fresh_worker(&self, extension_id: &str, stale: &[TargetId]) -> Result<()> {
        let deadline = Instant::now() + SERVICE_WORKER_WAIT;
        loop {
            let is_expired = Instant::now() >= deadline;
            if is_expired {
                return Err(BrowserError::Timeout("the extension's service worker"));
            }
            let workers = self.list_worker_ids(extension_id).await;
            if workers.iter().any(|id| !stale.contains(id)) {
                return Ok(());
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

    async fn reload_extension_now(&self, plan: &ExtensionReloadPlan) -> Result<usize> {
        let id = self.resolve_extension_id().await?;
        let stale = self.list_worker_ids(&id).await;
        self.reload_extension_process(&id).await?;
        // A reload that leaves the extension disabled is undone by a second one
        if self.wait_for_fresh_worker(&id, &stale).await.is_err() {
            self.reload_extension_process(&id).await?;
            self.wait_for_fresh_worker(&id, &stale).await?;
        }
        let mut reloaded = 0;
        for target in self.client.list_targets().await? {
            let is_reloaded =
                is_matching_tab(&target, &plan.tab_patterns) && reload_page(&target).await;
            if is_reloaded {
                reloaded += 1;
            }
        }
        Ok(reloaded)
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
    fn reload_extension<'a>(&'a self, plan: &'a ExtensionReloadPlan) -> BoxFuture<'a, usize> {
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
    fn only_top_level_pages_matching_a_pattern_are_tabs() -> Result<()> {
        let patterns = ["https://www.youtube.com/*".to_owned()];
        let tab = target("page", "https://www.youtube.com/watch?v=1")?;
        assert!(is_matching_tab(&tab, &patterns));
        let frame = target("iframe", "https://www.youtube.com/embed/1")?;
        assert!(!is_matching_tab(&frame, &patterns));
        let other = target("page", "https://example.com/")?;
        assert!(!is_matching_tab(&other, &patterns));
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
