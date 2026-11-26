//! The `select!` loop: watcher batches in, rebuilds out.

use std::ops::ControlFlow;

use tokio::sync::mpsc;
use tokio::time::{sleep_until, Instant};

use super::{Host, Orchestrator};
use crate::changes::classifier::{classify_path, plan_rebuild, PathClass};
use crate::changes::watcher::ChangeBatch;
use crate::changes::workspace::Workspace;
use crate::types::RelPath;

async fn sleep_until_some(deadline: Option<Instant>) {
    sleep_until(deadline.unwrap_or_else(Instant::now)).await;
}

impl<H: Host, W: Workspace> Orchestrator<H, W> {
    pub(super) async fn event_loop(&mut self, mut changes: mpsc::Receiver<ChangeBatch>) {
        let shutdown = self.shutdown.clone();
        loop {
            let catch_up = self.static_bundle.deadline();
            let flow = tokio::select! {
                biased;
                () = shutdown.cancelled() => ControlFlow::Break(()),
                batch = changes.recv() => self.on_batch(batch, &mut changes).await,
                () = sleep_until_some(catch_up), if catch_up.is_some() => {
                    self.run_static_catch_up().await;
                    ControlFlow::Continue(())
                }
            };
            if flow.is_break() {
                return;
            }
        }
    }

    async fn on_batch(
        &mut self,
        batch: Option<ChangeBatch>,
        changes: &mut mpsc::Receiver<ChangeBatch>,
    ) -> ControlFlow<()> {
        let Some(batch) = batch else {
            return ControlFlow::Break(());
        };
        self.ingest(batch).await;
        self.drain(changes).await;
        self.static_bundle = self.static_bundle.schedule_after_drain(Instant::now());
        ControlFlow::Continue(())
    }

    async fn ingest(&mut self, batch: ChangeBatch) {
        for event in batch.events {
            self.ingest_path(&event.path).await;
        }
    }

    async fn ingest_path(&mut self, path: &RelPath) {
        let class = classify_path(&self.rules, path);
        if class == PathClass::InstallMarker {
            let hash = self
                .files
                .installed_lockfile_hash()
                .await
                .unwrap_or_default();
            if !self.install_gate.is_dependency_set_changed(hash) {
                return;
            }
        }
        self.static_bundle = self.static_bundle.without_deadline();
        self.last_changed = Some(path.clone());
        self.pending.record(class);
    }

    async fn drain(&mut self, changes: &mut mpsc::Receiver<ChangeBatch>) {
        loop {
            while let Ok(batch) = changes.try_recv() {
                self.ingest(batch).await;
            }
            if self.shutdown.is_cancelled() {
                return;
            }
            let Some(plan) = plan_rebuild(self.pending.take()) else {
                return;
            };
            if let Some(path) = self.last_changed.take() {
                tracing::info!("Change detected: {} - rebuilding", path.as_str());
            }
            if let Err(error) = self.execute(plan).await {
                tracing::warn!("Rebuild failed: {error}");
            }
        }
    }
}
