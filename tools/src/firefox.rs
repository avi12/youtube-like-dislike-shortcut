//! The two Firefox protocols the dev server talks: Marionette to install the add-on and the
//! Remote Debugging Protocol to reach its background.

mod framed;
pub(crate) mod marionette;
pub(crate) mod rdp;

/// The port Firefox's Marionette server listens on unless told otherwise.
pub(crate) const MARIONETTE_DEFAULT_PORT: u16 = 2828;

/// Everything that can go wrong talking to Firefox.
#[derive(Debug, thiserror::Error)]
pub(crate) enum FirefoxError {
    /// The shared RDP framing library failed.
    #[error(transparent)]
    Library(#[from] dev_hot::Error),
    /// Reading or writing a socket failed.
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    /// A JSON document did not parse or did not match its type.
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    /// A wait ran out.
    #[error("timeout waiting for {0}")]
    Timeout(String),
    /// A protocol answer failed in a way the caller must see.
    #[error("{0}")]
    Failed(String),
}

/// The result type of the Firefox protocols.
pub(crate) type Result<T> = std::result::Result<T, FirefoxError>;
