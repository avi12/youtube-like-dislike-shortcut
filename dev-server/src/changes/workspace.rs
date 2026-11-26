//! The disk access of the hot loop, behind a trait so its tests need no disk.

use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use tokio::task::spawn_blocking;

use crate::changes::classifier::hash_installed_lockfile;
use crate::changes::MANIFEST_FILE_NAME;
use crate::error::{Error, Result};
use crate::types::ContentHash;

/// What the hot loop reads from disk.
pub trait Workspace: Send + Sync {
    /// The hash of the installed dependency set, `None` when there is no lockfile.
    fn installed_lockfile_hash(&self) -> impl Future<Output = Result<Option<ContentHash>>> + Send;
    /// Whether the build output holds a manifest; a failed build leaves none.
    fn has_build_output(&self) -> impl Future<Output = Result<bool>> + Send;
}

/// The [`Workspace`] on the real disk.
#[derive(Debug, Clone)]
pub struct DiskWorkspace {
    output_dir: Arc<Path>,
    installed_lockfile: Arc<Path>,
}

impl DiskWorkspace {
    /// A workspace over a build output directory and the dependency lockfile.
    pub fn new(output_dir: PathBuf, installed_lockfile: PathBuf) -> Self {
        Self {
            output_dir: output_dir.into(),
            installed_lockfile: installed_lockfile.into(),
        }
    }
}

async fn blocking<T, F>(work: F) -> Result<T>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T> + Send + 'static,
{
    spawn_blocking(work)
        .await
        .map_err(|error| Error::Io(std::io::Error::other(error)))?
}

impl Workspace for DiskWorkspace {
    async fn installed_lockfile_hash(&self) -> Result<Option<ContentHash>> {
        let lockfile = Arc::clone(&self.installed_lockfile);
        blocking(move || hash_installed_lockfile(&lockfile)).await
    }

    async fn has_build_output(&self) -> Result<bool> {
        let manifest = self.output_dir.join(MANIFEST_FILE_NAME);
        blocking(move || Ok(manifest.try_exists()?)).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn a_missing_build_and_lockfile_read_as_absent() -> Result<()> {
        let directory =
            std::env::temp_dir().join(format!("dev-hot-workspace-{}", std::process::id()));
        let workspace = DiskWorkspace::new(directory.clone(), directory.join("lock"));
        assert!(!workspace.has_build_output().await?);
        assert_eq!(workspace.installed_lockfile_hash().await?, None);
        Ok(())
    }
}
