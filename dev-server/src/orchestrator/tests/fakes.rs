//! In-memory stand-ins for the host and the disk, each logging what the loop asked for so a test
//! can assert on order and timing.

use std::collections::VecDeque;
use std::future::{ready, Future};
use std::sync::{Arc, Mutex};

use tokio::time::Instant;

use crate::changes::workspace::Workspace;
use crate::error::{Error, Result};
use crate::orchestrator::{HmrOutcome, Host};
use crate::types::{ContentHash, RelPath};

#[derive(Clone, Default)]
pub(super) struct Log(Arc<Mutex<Vec<(Instant, String)>>>);

impl Log {
    pub(super) fn push(&self, entry: impl Into<String>) {
        self.0.lock().unwrap().push((Instant::now(), entry.into()));
    }

    pub(super) fn entries(&self) -> Vec<String> {
        self.0
            .lock()
            .unwrap()
            .iter()
            .map(|(_, entry)| entry.clone())
            .collect()
    }

    pub(super) fn time_of(&self, entry: &str, nth: usize) -> Instant {
        let log = self.0.lock().unwrap();
        log.iter()
            .filter(|(_, text)| text == entry)
            .nth(nth)
            .unwrap()
            .0
    }

    pub(super) fn count(&self, entry: &str) -> usize {
        self.entries().iter().filter(|text| *text == entry).count()
    }
}

#[derive(Default)]
pub(super) struct DiskState {
    pub(super) lockfile: Option<ContentHash>,
    pub(super) is_output_missing: bool,
    /// The failures the next builds report, front first.
    pub(super) build_failures: VecDeque<String>,
    /// Why the next HMR builds cannot be taken in place, front first.
    pub(super) reload_reasons: VecDeque<String>,
}

#[derive(Clone)]
pub(super) struct FakeHost {
    pub(super) log: Log,
    pub(super) disk: Arc<Mutex<DiskState>>,
}

impl Host for FakeHost {
    fn build_extension(&self) -> impl Future<Output = Result<()>> + Send {
        ready({
            self.log.push("build");
            let failure = self.disk.lock().unwrap().build_failures.pop_front();
            failure.map_or(Ok(()), |message| Err(Error::Host { message }))
        })
    }

    fn rebuild_hmr(&self) -> impl Future<Output = Result<HmrOutcome>> + Send {
        ready({
            self.log.push("rebuildHmr");
            Ok(HmrOutcome {
                hmr_source_files: vec![RelPath::new("src/graph.svelte")],
                full_reload_reason: self.disk.lock().unwrap().reload_reasons.pop_front(),
            })
        })
    }

    fn apply_update(&self, _started: Instant) -> impl Future<Output = Result<()>> + Send {
        ready({
            self.log.push("apply");
            Ok(())
        })
    }
}

#[derive(Clone)]
pub(super) struct FakeFiles {
    pub(super) state: Arc<Mutex<DiskState>>,
}

impl Workspace for FakeFiles {
    fn installed_lockfile_hash(&self) -> impl Future<Output = Result<Option<ContentHash>>> + Send {
        ready(Ok(self.state.lock().unwrap().lockfile.clone()))
    }

    fn has_build_output(&self) -> impl Future<Output = Result<bool>> + Send {
        ready(Ok(!self.state.lock().unwrap().is_output_missing))
    }
}
