//! Starts the loop against the fakes and drives it: touch files, let the paused clock run, stop it.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tokio_util::sync::CancellationToken;

use crate::changes::classifier::PathRules;
use crate::changes::watcher::{ChangeBatch, ChangeEvent, ChangeKind};
use crate::orchestrator::tests::fakes::{DiskState, FakeFiles, FakeHost, Log};
use crate::orchestrator::{run, Deps};
use crate::types::RelPath;

const QUEUE_CAPACITY: usize = 16;
const LONG_ENOUGH: Duration = Duration::from_secs(20);
pub(super) const HOT_FILE: &str = "src/a.svelte";
pub(super) const INSTALL_MARKER: &str = "bun.lock";

pub(super) struct Harness {
    pub(super) log: Log,
    pub(super) disk: Arc<Mutex<DiskState>>,
    pub(super) changes: mpsc::Sender<ChangeBatch>,
    pub(super) shutdown: CancellationToken,
    pub(super) task: JoinHandle<()>,
}

pub(super) async fn start(setup: impl FnOnce(&mut DiskState)) -> Harness {
    let log = Log::default();
    let disk = Arc::<Mutex<DiskState>>::default();
    setup(&mut disk.lock().unwrap());
    let (changes, change_receiver) = mpsc::channel(QUEUE_CAPACITY);
    let deps = Deps {
        host: FakeHost {
            log: log.clone(),
            disk: Arc::clone(&disk),
        },
        workspace: FakeFiles {
            state: Arc::clone(&disk),
        },
        rules: PathRules {
            install_marker: Some(RelPath::new(INSTALL_MARKER)),
            hmr_sources: [RelPath::new(HOT_FILE)].into(),
        },
        changes: change_receiver,
    };
    let shutdown = CancellationToken::new();
    let task = tokio::spawn(run(deps, shutdown.clone()));
    sleep(Duration::from_millis(1)).await;
    Harness {
        log,
        disk,
        changes,
        shutdown,
        task,
    }
}

impl Harness {
    pub(super) async fn touch(&self, paths: &[&str]) {
        let events = paths
            .iter()
            .map(|path| ChangeEvent {
                path: RelPath::new(path),
                kind: ChangeKind::Modified,
            })
            .collect();
        self.changes.send(ChangeBatch { events }).await.unwrap();
    }

    pub(super) async fn settle(&self) {
        sleep(LONG_ENOUGH).await;
    }

    pub(super) async fn stop(self) {
        self.shutdown.cancel();
        self.task.await.unwrap();
    }
}
