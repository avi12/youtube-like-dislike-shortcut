//! The failures of a browser target.

use thiserror::Error;

use crate::cdp::CdpError;
use crate::firefox::FirefoxError;

/// Everything that can go wrong updating a running browser.
#[derive(Debug, Error)]
pub(crate) enum BrowserError {
    /// Talking CDP failed.
    #[error(transparent)]
    Cdp(#[from] CdpError),
    /// Talking to Firefox failed.
    #[error(transparent)]
    Firefox(#[from] FirefoxError),
    /// The shared CDP library failed.
    #[error(transparent)]
    Library(#[from] dev_hot::Error),
    /// A JSON document did not parse or did not match its type.
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    /// The browser answered in a way the dev server cannot use.
    #[error("{0}")]
    Protocol(String),
    /// An evaluated expression threw in the extension.
    #[error("the background threw: {0}")]
    Exception(String),
    /// A wait ran out.
    #[error("timed out waiting for {0}")]
    Timeout(&'static str),
}

/// The result type of a browser target.
pub(crate) type Result<T> = std::result::Result<T, BrowserError>;
