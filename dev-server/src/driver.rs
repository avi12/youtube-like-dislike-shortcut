//! The two browser debugging protocols: the Chrome `DevTools` Protocol and Firefox's Remote
//! Debugging Protocol. This module holds their wire types and discovery; the sessions that drive a
//! browser live with the dev server's browser targets.

pub mod cdp;
mod net;
pub mod rdp;
