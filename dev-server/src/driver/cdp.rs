//! CDP target discovery over the debug port's HTTP endpoint, and the command wire types.

mod http;
pub mod protocol;
mod target;

pub use self::http::{request as debug_port_request, Verb};
pub use self::target::{CdpTarget, TargetId, TargetKind};
use crate::error::Result;
use crate::types::Port;

/// A browser's remote debugging port.
#[derive(Debug, Clone, Copy)]
pub struct CdpClient {
    port: Port,
}

impl CdpClient {
    /// A client of the browser on `port`.
    pub const fn new(port: Port) -> Self {
        Self { port }
    }

    /// Every target the browser reports.
    pub async fn list_targets(&self) -> Result<Vec<CdpTarget>> {
        Ok(serde_json::from_str(&http::list_targets(self.port).await?)?)
    }
}
