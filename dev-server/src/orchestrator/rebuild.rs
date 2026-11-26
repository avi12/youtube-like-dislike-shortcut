//! Carrying out one [`RebuildPlan`]: the hot swap, the full rebuild and update, and the
//! static-bundle catch-up once the edits go quiet.

use std::time::Duration;

use tokio::time::{sleep, Instant};

use super::schedule::StaticBundle;
use super::{Host, Orchestrator, SWAP_SETTLE};
use crate::changes::classifier::RebuildPlan;
use crate::changes::workspace::Workspace;
use crate::error::Result;

impl<H: Host, W: Workspace> Orchestrator<H, W> {
    pub(super) async fn execute(&mut self, plan: RebuildPlan) -> Result<()> {
        let started = Instant::now();
        match plan {
            RebuildPlan::HotSwap => self.hot_swap(started).await,
            RebuildPlan::Full => self.rebuild_and_apply(started).await,
        }
    }

    /// Rebuilds only the HMR modules, which the running pages pick up by themselves. A failed build
    /// leaves no output to swap into, and some builds cannot be taken in place: both take the full
    /// rebuild instead.
    async fn hot_swap(&mut self, started: Instant) -> Result<()> {
        if !self.files.has_build_output().await? {
            tracing::warn!(
                "manifest.json is missing (the last build failed?) - full rebuild instead of a hot swap"
            );
            return self.rebuild_and_apply(started).await;
        }
        let outcome = self.rebuild_hmr().await?;
        if let Some(reason) = outcome.full_reload_reason {
            tracing::info!("Cannot hot swap: {reason} - full rebuild");
            return self.rebuild_and_apply(started).await;
        }
        self.last_hot_swap = Some(Instant::now());
        self.static_bundle = StaticBundle::Stale;
        tracing::info!(
            "Hot swapped ({}ms) - HMR, no reload",
            started.elapsed().as_millis()
        );
        Ok(())
    }

    async fn rebuild_and_apply(&mut self, started: Instant) -> Result<()> {
        self.build_all().await?;
        let remaining_settle = self
            .last_hot_swap
            .take()
            .and_then(|swapped| SWAP_SETTLE.checked_sub(swapped.elapsed()));
        if let Some(remaining) = remaining_settle {
            self.pause(remaining).await;
        }
        self.host.apply_update(started).await
    }

    /// Sleeps for `duration`, cut short by shutdown.
    async fn pause(&self, duration: Duration) {
        tokio::select! {
            () = sleep(duration) => {}
            () = self.shutdown.cancelled() => {}
        }
    }

    /// After the edits stop, brings the static bundle up to date without touching the browser.
    pub(super) async fn run_static_catch_up(&mut self) {
        self.static_bundle = self.static_bundle.without_deadline();
        if !self.static_bundle.is_stale() {
            return;
        }
        let started = Instant::now();
        match self.build_all().await {
            Ok(()) => tracing::info!(
                "Static bundle caught up ({}ms) - a fresh page load now matches the live page",
                started.elapsed().as_millis()
            ),
            Err(error) => tracing::warn!(
                "Static bundle catch-up failed - retrying after the next edit: {error}"
            ),
        }
    }
}
