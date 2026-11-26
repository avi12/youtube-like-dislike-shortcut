//! The two browser families.

mod chromium;
mod firefox;

pub(crate) use self::chromium::ChromiumTarget;
pub(crate) use self::firefox::{FirefoxTarget, FirefoxTargetConfig};
