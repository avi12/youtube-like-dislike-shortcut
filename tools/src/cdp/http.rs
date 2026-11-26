//! The debug port's plain HTTP endpoints, over a bare TCP stream.

use std::time::Duration;

use dev_hot::driver::cdp::{debug_port_request, Verb};
use dev_hot::types::Port;
use dev_hot::Error;
use serde::Deserialize;

use super::error::{CdpError, Result};

const HTTP_TIMEOUT: Duration = Duration::from_secs(5);
const GET_ATTEMPTS: usize = 3;

async fn send(port: Port, verb: Verb, path: &str) -> Result<String> {
    debug_port_request(port, verb, path, HTTP_TIMEOUT)
        .await
        .map_err(|error| match error {
            Error::Timeout(_) => CdpError::Timeout("the debug port"),
            other => CdpError::Http(other.to_string()),
        })
}

/// A reload or a waking service worker can leave the debug port unanswered for a few seconds; a
/// `GET` changes nothing, so it is safe to ask again.
async fn get(port: Port, path: &str) -> Result<String> {
    let mut outcome = send(port, Verb::Get, path).await;
    for _ in 1..GET_ATTEMPTS {
        if !matches!(outcome, Err(CdpError::Timeout(_))) {
            break;
        }
        outcome = send(port, Verb::Get, path).await;
    }
    outcome
}

/// A tab opened through `/json/new`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NewTab {
    /// The id to close it with.
    pub(crate) id: String,
    /// Where to open a session on it.
    pub(crate) web_socket_debugger_url: String,
}

/// Opens a tab on `url` (`PUT /json/new?<url>`).
pub(crate) async fn open_tab(port: Port, url: &str) -> Result<NewTab> {
    Ok(serde_json::from_str(
        &send(port, Verb::Put, &format!("/json/new?{url}")).await?,
    )?)
}

/// Closes one target (`/json/close/<id>`).
pub(crate) async fn close_target(port: Port, target_id: &str) -> Result<()> {
    get(port, &format!("/json/close/{target_id}")).await?;
    Ok(())
}
