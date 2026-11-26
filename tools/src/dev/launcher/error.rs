//! What can stop the dev server.

use thiserror::Error;

use crate::dev::hmr::HmrError;
use crate::output::error::OutputError;

/// A failure of the launcher or of one of the steps it runs.
#[derive(Debug, Error)]
#[non_exhaustive]
pub(crate) enum LauncherError {
    /// Reading or writing a file, a socket or a pipe failed.
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    /// A JSON document did not parse or did not match its type.
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    /// The shared watching and protocol library failed.
    #[error(transparent)]
    Library(#[from] dev_hot::Error),
    /// The build output or the profile could not be handled.
    #[error(transparent)]
    Output(#[from] OutputError),
    /// The HMR build failed.
    #[error(transparent)]
    Hmr(#[from] HmrError),
    /// A helper program could not run.
    #[error(transparent)]
    Process(#[from] crate::process::ProcessError),
    /// The dev browser could not be started.
    #[error("browser: {0}")]
    Browser(String),
    /// The input is well-formed but not usable, or a build failed.
    #[error("{0}")]
    Invalid(String),
}

/// The result type of the launcher.
pub(crate) type Result<T> = std::result::Result<T, LauncherError>;
