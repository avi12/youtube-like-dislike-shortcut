//! The main loop tying the modules together.
//!
//! One `tokio::select!` loop over {the shutdown token, watcher batches, the static-bundle catch-up
//! timer}. A batch is classified with [`crate::changes::classifier`], folded into a
//! [`PendingState`] and drained into one [`RebuildPlan`](crate::changes::classifier::RebuildPlan)
//! at a time; the loop is sequential, so a batch arriving mid-build waits in the (bounded) channel
//! and is folded into the next window, never run concurrently. The loop is generic over [`Host`]
//! and [`Workspace`], so its tests drive fakes under `tokio::time::pause`.
//!
//! A hot swap makes the running pages import new modules. Firefox segfaults a content process when
//! such an import fails inside a world an extension reload just tore down, so an update that follows
//! a hot swap first waits out [`SWAP_SETTLE`].

use std::future::Future;
use std::time::Duration;

use tokio::sync::mpsc;
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;

use crate::changes::classifier::{InstallGate, PathRules, PendingState};
use crate::changes::watcher::ChangeBatch;
use crate::changes::workspace::Workspace;
use crate::error::Result;
use crate::types::RelPath;

use self::schedule::StaticBundle;

mod build;
mod event_loop;
mod rebuild;
mod schedule;
#[cfg(test)]
mod tests;

/// How long the running pages need to finish the imports a hot swap set off.
pub const SWAP_SETTLE: Duration = Duration::from_millis(2000);
/// Quiet time after the last hot swap before the static bundle is caught up.
pub const STATIC_CATCH_UP_IDLE: Duration = Duration::from_millis(1500);
/// Delay before a build that hit a transient file lock is retried.
pub const BUILD_RETRY_DELAY: Duration = Duration::from_millis(300);
/// Attempts of a build that keeps hitting a transient file lock.
pub const MAX_BUILD_ATTEMPTS: u32 = 3;

/// What one HMR build reports.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct HmrOutcome {
    /// Every source file an edit can hot swap.
    pub hmr_source_files: Vec<RelPath>,
    /// Why the running pages cannot take this build in place, when they cannot.
    pub full_reload_reason: Option<String>,
}

/// What the loop asks of whoever builds the extension and drives the browser.
pub trait Host: Send + Sync {
    /// Builds the whole extension.
    fn build_extension(&self) -> impl Future<Output = Result<()>> + Send;
    /// Builds the modules the running pages hot swap.
    fn rebuild_hmr(&self) -> impl Future<Output = Result<HmrOutcome>> + Send;
    /// Applies the newest build to the browser with the smallest update that makes it live.
    fn apply_update(&self, started: Instant) -> impl Future<Output = Result<()>> + Send;
}

/// Everything the loop needs.
#[derive(Debug)]
pub struct Deps<H, W> {
    /// Builds and browser updates.
    pub host: H,
    /// Disk access.
    pub workspace: W,
    /// The install marker and the first build's hot swappable files.
    pub rules: PathRules,
    /// Debounced batches of changed files.
    pub changes: mpsc::Receiver<ChangeBatch>,
}

struct Orchestrator<H, W> {
    host: H,
    files: W,
    shutdown: CancellationToken,
    rules: PathRules,
    pending: PendingState,
    install_gate: InstallGate,
    last_changed: Option<RelPath>,
    last_hot_swap: Option<Instant>,
    static_bundle: StaticBundle,
}

/// Runs until `shutdown` is cancelled or the watcher ends.
pub async fn run<H, W>(deps: Deps<H, W>, shutdown: CancellationToken)
where
    H: Host,
    W: Workspace,
{
    let Deps {
        host,
        workspace,
        rules,
        changes,
    } = deps;
    let install_hash = workspace
        .installed_lockfile_hash()
        .await
        .unwrap_or_default();
    let mut orchestrator = Orchestrator {
        host,
        files: workspace,
        shutdown,
        rules,
        pending: PendingState::default(),
        install_gate: InstallGate::new(install_hash),
        last_changed: None,
        last_hot_swap: None,
        static_bundle: StaticBundle::Current,
    };
    orchestrator.event_loop(changes).await;
    tracing::info!("Hot loop stopped");
}
