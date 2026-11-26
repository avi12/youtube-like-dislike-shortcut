//! The one error type of the library. The binary only prints it.

use thiserror::Error;

/// Everything that can go wrong in the hot loop.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum Error {
    /// A port was zero.
    #[error("port 0 is not a usable port")]
    InvalidPort,
    /// A file, socket or stream failed.
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    /// A message or file was not the expected JSON.
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    /// The file watcher failed.
    #[error("watcher: {0}")]
    Watch(#[from] notify::Error),
    /// The host could not carry out what the loop asked of it.
    #[error("the host failed the request: {message}")]
    Host {
        /// The host's own description of the failure.
        message: String,
    },
    /// A browser sent something the debugging protocol does not allow.
    #[error("protocol: {0}")]
    Protocol(String),
    /// A browser did not answer in time.
    #[error("timed out waiting for {0}")]
    Timeout(&'static str),
}

/// The result of this crate's operations.
pub type Result<T> = std::result::Result<T, Error>;
