//! One CDP session: a WebSocket to one target, replies matched to commands by id.

use std::time::Duration;

use dev_hot::driver::cdp::protocol::{encode_command, EvaluateParams, Incoming, Method};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::net::TcpStream;
use tokio::time::timeout;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};

use super::error::{CdpError, Result};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const REPLY_TIMEOUT: Duration = Duration::from_secs(30);

/// The `message` of a failed command.
#[derive(Debug, Deserialize)]
struct ErrorBody {
    message: String,
}

/// The result of `Runtime.evaluate`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EvaluateReply {
    #[serde(default)]
    result: RemoteValue,
    exception_details: Option<ExceptionDetails>,
}

/// A value asked by value: arbitrary page data.
#[derive(Debug, Default, Deserialize)]
struct RemoteValue {
    value: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct ExceptionDetails {
    text: String,
    exception: Option<ThrownValue>,
}

#[derive(Debug, Deserialize)]
struct ThrownValue {
    description: Option<String>,
}

impl EvaluateReply {
    fn into_value(self) -> Result<Value> {
        let Some(details) = self.exception_details else {
            return Ok(self.result.value.unwrap_or(Value::Null));
        };
        let description = details.exception.and_then(|thrown| thrown.description);
        Err(CdpError::Exception(description.unwrap_or(details.text)))
    }
}

/// One `DevTools` session.
pub(crate) struct Session {
    socket: WebSocketStream<MaybeTlsStream<TcpStream>>,
    next_id: u64,
}

impl Session {
    /// Connects to a target's WebSocket debugger URL.
    pub(crate) async fn open(url: &str) -> Result<Self> {
        let (socket, _response) = timeout(CONNECT_TIMEOUT, connect_async(url))
            .await
            .map_err(|_| CdpError::Timeout("the WebSocket handshake"))??;
        Ok(Self { socket, next_id: 1 })
    }

    /// Ends the session.
    pub(crate) async fn close(mut self) {
        self.socket.close(None).await.ok();
    }

    /// Sends a command and returns its `result`; events that arrive meanwhile are skipped.
    pub(crate) async fn call<P: Serialize + Sync>(
        &mut self,
        method: Method,
        params: &P,
    ) -> Result<Value> {
        let id = self.next_id;
        self.next_id += 1;
        let payload = encode_command(id, method, params)?;
        self.socket.send(Message::text(payload)).await?;
        timeout(REPLY_TIMEOUT, self.reply_to(id, method))
            .await
            .map_err(|_| CdpError::Timeout("a CDP reply"))?
    }

    async fn reply_to(&mut self, id: u64, method: Method) -> Result<Value> {
        loop {
            let frame = self.read_frame().await?;
            if frame.id != Some(id) {
                continue;
            }
            if let Some(error) = frame.error {
                let ErrorBody { message } = serde_json::from_value(error)?;
                return Err(CdpError::Protocol(format!("{method:?}: {message}")));
            }
            return Ok(frame.result.unwrap_or(Value::Null));
        }
    }

    async fn read_frame(&mut self) -> Result<Incoming> {
        while let Some(message) = self.socket.next().await {
            if let Message::Text(text) = message? {
                return Ok(serde_json::from_str(text.as_str())?);
            }
        }
        Err(CdpError::Closed)
    }

    /// `Runtime.evaluate` (awaiting a promise, by value).
    pub(crate) async fn evaluate(&mut self, expression: &str) -> Result<Value> {
        let params = EvaluateParams::awaited(expression);
        let reply = self.call(Method::RuntimeEvaluate, &params).await?;
        serde_json::from_value::<EvaluateReply>(reply)?.into_value()
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn a_thrown_exception_is_an_error_with_its_description() -> Result<()> {
        let reply: EvaluateReply = serde_json::from_value(json!({
            "exceptionDetails": {"text": "Uncaught", "exception": {"description": "Error: no"}}
        }))?;
        assert!(
            matches!(reply.into_value(), Err(CdpError::Exception(text)) if text == "Error: no")
        );
        Ok(())
    }
}
