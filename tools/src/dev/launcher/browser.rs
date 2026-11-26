//! Launching the dev browser: a Chromium with `--load-extension`, or Firefox with a debugger server
//! and a temporary add-on.

mod cft;
mod chromium;
mod firefox;
mod marionette;

use std::path::Path;
use std::sync::Arc;

use dev_hot::types::Port;
use tokio::process::Child;

use crate::dev::browsers::{ChromiumTarget, FirefoxTarget, FirefoxTargetConfig, ReloadTarget};
use crate::dev::launcher::error::Result;
use crate::output::manifest::ExtensionManifest;
use crate::output::options::{DevOptions, HostEnvironment};

/// What launching needs to know.
#[derive(Debug, Clone, Copy)]
pub(super) struct BrowserLaunch<'a> {
    pub(super) options: &'a DevOptions,
    pub(super) host: &'a HostEnvironment,
    pub(super) output_directory: &'a Path,
}

/// How a running browser is reached.
#[derive(Debug, Clone, Copy)]
enum DebugEndpoint {
    /// Chromium's `DevTools` port.
    Cdp(u16),
    /// Firefox's debugger server port.
    Rdp(u16),
}

/// A running dev browser: the process this launcher started, and how to reach it.
#[derive(Debug)]
pub(super) struct RunningBrowser {
    pub(super) child: Child,
    endpoint: DebugEndpoint,
}

impl RunningBrowser {
    /// The reload target of this browser, running the extension built in `output_directory`.
    pub(super) fn reload_target(&self, output_directory: &Path) -> Result<Arc<dyn ReloadTarget>> {
        let manifest = ExtensionManifest::read(output_directory)?;
        Ok(match self.endpoint {
            DebugEndpoint::Cdp(port) => {
                Arc::new(ChromiumTarget::new(Port::new(port)?, manifest.name()?))
            }
            DebugEndpoint::Rdp(port) => Arc::new(FirefoxTarget::new(FirefoxTargetConfig {
                rdp_port: Port::new(port)?,
                extension_id: manifest.gecko_id()?,
            })),
        })
    }
}

/// Starts the browser the options name, with the extension from the output directory loaded.
pub(super) async fn launch(launch: BrowserLaunch<'_>) -> Result<RunningBrowser> {
    if !launch.options.browser.is_firefox() {
        return Ok(RunningBrowser {
            child: chromium::launch(launch).await?,
            endpoint: DebugEndpoint::Cdp(launch.options.cdp_port),
        });
    }
    let (child, rdp_port) = firefox::launch(launch).await?;
    Ok(RunningBrowser {
        child,
        endpoint: DebugEndpoint::Rdp(rdp_port),
    })
}
