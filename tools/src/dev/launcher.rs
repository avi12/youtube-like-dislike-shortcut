//! The dev server launcher, `devtool dev`: production builds and one long-lived browser with the
//! extension sideloaded, kept current by the hot loop of `dev_hot`.
//!
//! Closing the browser ends the server and ending the server closes the browser; only the process
//! this launcher started, and leftover browsers on its own profile, are ever stopped.

mod browser;
mod build;
mod error;
mod host;
mod log;
mod wxt_worker;

use std::net::{Ipv4Addr, TcpListener};
use std::time::Duration;

use clap::Args;
use dev_hot::changes::classifier::PathRules;
use dev_hot::changes::watcher::{self, WatchConfig};
use dev_hot::changes::workspace::DiskWorkspace;
use dev_hot::orchestrator::{run as run_hot_loop, Deps, Host};
use dev_hot::types::RelPath;
use tokio_util::sync::CancellationToken;

use self::browser::{launch, BrowserLaunch, RunningBrowser};
use self::error::{LauncherError, Result};
use self::host::DevHost;
use self::log::{install_log_layer, log_event};
use crate::output::options::{resolve_options, DevOptions, HostEnvironment, OptionArgs};
use crate::output::profile::{clean_leftover_instances, setup_profile};

/// Bun's lockfile, whose change may mean the installed dependencies changed.
const INSTALL_MARKER: &str = "bun.lock";
/// The build inputs: the source, the config, the lockfile and the env files of the build mode.
const WATCHED_PATHS: [&str; 8] = [
    "src",
    "wxt.config.ts",
    "package.json",
    INSTALL_MARKER,
    ".env",
    ".env.local",
    ".env.prod",
    ".env.prod.local",
];
const WATCH_POLL_INTERVAL: Duration = Duration::from_millis(500);
const REBUILD_DEBOUNCE: Duration = Duration::from_millis(50);
const HOT_LOOP_STOP_TIMEOUT: Duration = Duration::from_secs(5);

/// Arguments of `devtool dev`.
#[derive(Debug, Args)]
pub(crate) struct RunArgs {
    #[command(flatten)]
    options: OptionArgs,
}

/// Runs the dev server until the browser closes or the process is interrupted.
pub(crate) async fn run(args: RunArgs) -> Result<()> {
    Box::pin(start(&args)).await
}

/// A browser already listening there is not the one about to be launched, and driving it would
/// reload someone else's extension and tabs.
fn require_free_port(port: u16) -> Result<()> {
    TcpListener::bind((Ipv4Addr::LOCALHOST, port))
        .map(drop)
        .map_err(|error| {
            LauncherError::Invalid(format!(
                "port {port} is in use ({error}) - pass --cdp-port, or --marionette-port for Firefox"
            ))
        })
}

fn require_free_ports(options: &DevOptions) -> Result<()> {
    require_free_port(options.cdp_port)?;
    if options.browser.is_firefox() {
        require_free_port(options.marionette_port)?;
    }
    Ok(())
}

async fn start(args: &RunArgs) -> Result<()> {
    let environment = HostEnvironment::detect();
    let options = resolve_options(&args.options, &environment)?;
    std::env::set_current_dir(&options.project_root)?;
    install_log_layer()?;
    clean_leftover_instances(&options, &environment).await?;
    require_free_ports(&options)?;
    setup_profile(&options, &environment)?;

    let name = options.browser.name();
    log_event(&format!("Building extension for {name} (production)..."));
    // Watching starts before the build, so a save made while the browser starts is not lost
    let shutdown = CancellationToken::new();
    let watch = WatchConfig {
        root: options.project_root.clone(),
        paths: WATCHED_PATHS.iter().map(RelPath::new).collect(),
        poll_interval: WATCH_POLL_INTERVAL,
        debounce: REBUILD_DEBOUNCE,
    };
    let changes = watcher::spawn(watch, shutdown.clone())?;
    let host = DevHost::new(options.clone());
    host.build_extension().await?;
    let first_build = host.rebuild_hmr().await?;
    let output_directory = options.output_directory();
    log_event(&format!("Build complete: {}", output_directory.display()));

    let running = launch(BrowserLaunch {
        options: &options,
        host: &environment,
        output_directory: &output_directory,
    })
    .await?;
    log_event(&format!(
        "{name} launched with extension sideloaded (debug port {}, profile {})",
        options.cdp_port,
        options.profile_directory.display()
    ));
    host.attach(running.reload_target(&output_directory)?)
        .await?;
    let deps = Deps {
        host,
        workspace: DiskWorkspace::new(
            options.staged_output_directory(),
            options.project_root.join(INSTALL_MARKER),
        ),
        rules: PathRules {
            install_marker: Some(RelPath::new(INSTALL_MARKER)),
            hmr_sources: first_build.hmr_source_files.into_iter().collect(),
        },
        changes,
    };
    serve(deps, running, shutdown).await
}

/// Why the session ended.
enum Stop {
    HotLoop,
    Interrupted,
    BrowserClosed,
}

async fn serve(
    deps: Deps<DevHost, DiskWorkspace>,
    mut running: RunningBrowser,
    shutdown: CancellationToken,
) -> Result<()> {
    log_event("Watching for file changes...");
    let hot_loop = run_hot_loop(deps, shutdown.clone());
    tokio::pin!(hot_loop);
    let stop = tokio::select! {
        () = &mut hot_loop => Stop::HotLoop,
        () = interrupted() => Stop::Interrupted,
        _ = running.child.wait() => Stop::BrowserClosed,
    };
    if matches!(stop, Stop::BrowserClosed) {
        log_event("Browser closed. Exiting.");
    }
    shutdown.cancel();
    let is_hot_loop_running = !matches!(stop, Stop::HotLoop);
    if is_hot_loop_running {
        let stopped = tokio::time::timeout(HOT_LOOP_STOP_TIMEOUT, hot_loop).await;
        if stopped.is_err() {
            log_event("The running rebuild did not stop in time - abandoning it");
        }
    }
    // Only the process this launcher started
    if let Err(error) = running.child.kill().await {
        tracing::debug!("the browser had already ended: {error}");
    }
    Ok(())
}

#[cfg(unix)]
async fn interrupted() {
    use tokio::signal::unix::{signal, SignalKind};
    let Ok(mut terminate) = signal(SignalKind::terminate()) else {
        wait_for_ctrl_c().await;
        return;
    };
    tokio::select! {
        () = wait_for_ctrl_c() => {}
        _ = terminate.recv() => {}
    }
}

#[cfg(not(unix))]
async fn interrupted() {
    wait_for_ctrl_c().await;
}

/// Pends forever when the signal cannot be listened for: closing the browser still ends the server.
async fn wait_for_ctrl_c() {
    if let Err(error) = tokio::signal::ctrl_c().await {
        tracing::warn!("Ctrl+C cannot be handled: {error}");
        std::future::pending::<()>().await;
    }
}

#[cfg(test)]
mod tests {
    use crate::dev::launcher::*;

    #[test]
    fn a_taken_port_is_refused() -> Result<()> {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))?;
        let port = listener.local_addr()?.port();
        assert!(require_free_port(port).is_err());
        Ok(())
    }
}
