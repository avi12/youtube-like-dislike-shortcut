//! The parameters of each Marionette command, in `WebDriver`'s wire names.

use serde::Serialize;

/// `WebDriver:NewSession`, asking for no particular capabilities.
#[derive(Debug, Default, Serialize)]
pub(super) struct NewSession {
    capabilities: NoCapabilities,
}

#[derive(Debug, Default, Serialize)]
struct NoCapabilities {}

/// `Addon:Install`.
#[derive(Debug, Serialize)]
pub(super) struct InstallAddon<'path> {
    path: &'path str,
    temporary: bool,
}

impl<'path> InstallAddon<'path> {
    /// An add-on that is gone after a restart.
    pub(super) const fn temporary(path: &'path str) -> Self {
        Self {
            path,
            temporary: true,
        }
    }
}
