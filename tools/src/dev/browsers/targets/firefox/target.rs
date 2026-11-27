//! The Firefox reload target: `runtime.reload()` through the background, then the content scripts
//! re-injected by the restarted background.

use std::time::Duration;

use dev_hot::types::Port;
use serde_json::Value;

use crate::dev::browsers::error::Result;
use crate::dev::browsers::scripts::{self, RUNTIME_RELOAD};
use crate::dev::browsers::target::{BoxFuture, Reinjection, ReloadTarget};
use crate::dev::browsers::targets::firefox::background::{
    evaluate_in_background, run_script_in_background, BackgroundAddress,
};
use crate::output::reload::{ExtensionReloadPlan, PageRefreshPlan};

const BACKGROUND_RETRY_ATTEMPTS: u32 = 5;
const BACKGROUND_RETRY_DELAY: Duration = Duration::from_secs(1);

/// What a Firefox target is built from.
#[derive(Debug, Clone)]
pub(crate) struct FirefoxTargetConfig {
    /// Firefox's remote debugging (RDP) port.
    pub(crate) rdp_port: Port,
    /// The gecko id: Firefox's `runtime.id` and RDP's add-on id.
    pub(crate) extension_id: String,
}

/// A Firefox reached over RDP.
#[derive(Debug, Clone)]
pub(crate) struct FirefoxTarget {
    config: FirefoxTargetConfig,
}

impl FirefoxTarget {
    /// A target on a running Firefox.
    pub(crate) const fn new(config: FirefoxTargetConfig) -> Self {
        Self { config }
    }

    fn address(&self) -> BackgroundAddress<'_> {
        BackgroundAddress {
            port: self.config.rdp_port,
            extension_id: &self.config.extension_id,
        }
    }

    /// Right after a reload the add-on (and its background) is still starting up.
    async fn evaluate_once_restarted(&self, source: &str) -> Result<Value> {
        let mut attempt = 1;
        loop {
            tokio::time::sleep(BACKGROUND_RETRY_DELAY).await;
            match evaluate_in_background(self.address(), source).await {
                Ok(value) => return Ok(value),
                Err(error) if attempt >= BACKGROUND_RETRY_ATTEMPTS => return Err(error),
                Err(_) => attempt += 1,
            }
        }
    }

    async fn reload_extension_now(&self, plan: &ExtensionReloadPlan) -> Result<Reinjection> {
        // Firefox destroys a reloaded add-on's sandboxes without any cleanup, which would leave
        // its UI behind, so the running scripts are undone first
        if let Err(error) =
            evaluate_in_background(self.address(), &scripts::tab_teardown(plan)?).await
        {
            tracing::warn!("Could not undo the running content scripts: {error}");
        }
        // The reload ends the background before it can answer
        if let Err(error) = run_script_in_background(self.address(), RUNTIME_RELOAD.trim()).await {
            tracing::debug!("the reloading background did not answer: {error}");
        }
        let value = self
            .evaluate_once_restarted(&scripts::tab_reinject(plan)?)
            .await?;
        Ok(serde_json::from_value(value)?)
    }

    async fn refresh_pages_now(&self, plan: &PageRefreshPlan) -> Result<Vec<String>> {
        let value = evaluate_in_background(self.address(), &scripts::page_refresh(plan)?).await?;
        Ok(serde_json::from_value(value)?)
    }
}

impl ReloadTarget for FirefoxTarget {
    fn reload_extension<'a>(&'a self, plan: &'a ExtensionReloadPlan) -> BoxFuture<'a, Reinjection> {
        Box::pin(self.reload_extension_now(plan))
    }

    fn refresh_pages<'a>(&'a self, plan: &'a PageRefreshPlan) -> BoxFuture<'a, Vec<String>> {
        Box::pin(self.refresh_pages_now(plan))
    }
}
