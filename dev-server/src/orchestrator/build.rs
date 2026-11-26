//! Builds, retried while the browser holds an output file open.

use std::future::Future;

use tokio::time::sleep;

use crate::changes::workspace::Workspace;
use crate::error::{Error, Result};
use crate::orchestrator::schedule::StaticBundle;
use crate::orchestrator::{HmrOutcome, Host, Orchestrator, BUILD_RETRY_DELAY, MAX_BUILD_ATTEMPTS};

/// The file system errors a held file causes; builds are idempotent, so they are retried.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TransientFsCode {
    Eperm,
    Ebusy,
}

impl TransientFsCode {
    const ALL: [Self; 2] = [Self::Eperm, Self::Ebusy];

    const fn as_str(self) -> &'static str {
        match self {
            Self::Eperm => "EPERM",
            Self::Ebusy => "EBUSY",
        }
    }
}

async fn with_fs_retry<T, F, Fut>(mut run: F) -> Result<T>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T>>,
{
    let mut attempt = 1;
    loop {
        match run().await {
            Err(error) if attempt < MAX_BUILD_ATTEMPTS && is_transient_fs_error(&error) => {
                tracing::info!(
                    "Build hit a transient file lock (attempt {attempt}/{MAX_BUILD_ATTEMPTS}) - retrying"
                );
                sleep(BUILD_RETRY_DELAY).await;
                attempt += 1;
            }
            outcome => return outcome,
        }
    }
}

fn is_transient_fs_error(error: &Error) -> bool {
    let text = error.to_string();
    TransientFsCode::ALL
        .iter()
        .any(|code| text.contains(code.as_str()))
}

impl<H: Host, W: Workspace> Orchestrator<H, W> {
    /// The full build and its HMR modules, which every full build has to be followed by.
    pub(super) async fn build_all(&mut self) -> Result<()> {
        with_fs_retry(|| self.host.build_extension()).await?;
        self.rebuild_hmr().await?;
        self.static_bundle = StaticBundle::Current;
        Ok(())
    }

    pub(super) async fn rebuild_hmr(&mut self) -> Result<HmrOutcome> {
        let outcome = with_fs_retry(|| self.host.rebuild_hmr()).await?;
        self.rules.hmr_sources = outcome.hmr_source_files.iter().cloned().collect();
        Ok(outcome)
    }
}
