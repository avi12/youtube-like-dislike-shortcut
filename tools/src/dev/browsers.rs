//! The browser targets of the dev server: reloading the extension with its tabs and refreshing its
//! pages, on Chromium (over CDP) and Firefox (over RDP).

mod error;
mod scripts;
mod target;
mod targets;

pub(crate) use self::target::ReloadTarget;
pub(crate) use self::targets::{ChromiumTarget, FirefoxTarget, FirefoxTargetConfig};
