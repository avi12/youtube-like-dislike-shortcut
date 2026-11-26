//! The `DevTools` Protocol plumbing of the Chromium target: one WebSocket session and the debug
//! port's HTTP endpoints.

mod error;
mod http;
mod session;

pub(crate) use self::error::CdpError;
pub(crate) use self::http::{close_target, open_tab};
pub(crate) use self::session::Session;
