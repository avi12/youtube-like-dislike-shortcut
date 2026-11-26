//! The typed shape of RDP packets: actor names, the requests a client sends, and the forms it reads
//! from replies and notifications. Firefox's replies carry more than is read here, so unknown
//! fields are ignored.

use std::fmt;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::driver::rdp::packet::encode_packet;
use crate::error::Result;

const ROOT_ACTOR: &str = "root";
/// The browser's parent process, whose privileged console can wake an event page.
const PARENT_PROCESS_ID: u32 = 0;

/// The name of one RDP actor: the addressee (`to`) and sender (`from`) of every packet.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ActorId(String);

impl ActorId {
    /// An actor id from its wire text.
    pub fn new(raw: impl Into<String>) -> Self {
        Self(raw.into())
    }

    /// The root actor every connection starts with.
    pub fn root() -> Self {
        Self::new(ROOT_ACTOR)
    }

    /// The wire text.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ActorId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

/// Correlates an `evaluateJSAsync` acknowledgement with its later `evaluationResult`. The id is
/// opaque (only ever compared), so any JSON value is accepted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ResultId(Value);

/// The request types sent to actors (the `type` of an outgoing packet).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RequestKind {
    /// The installed add-ons.
    ListAddons,
    /// One process's descriptor.
    GetProcess,
    /// The target of a descriptor.
    GetTarget,
    /// The watcher of a descriptor.
    GetWatcher,
    /// Starts target announcements.
    WatchTargets,
    /// Evaluates in a console actor.
    #[serde(rename = "evaluateJSAsync")]
    EvaluateJsAsync,
}

/// The packet types a client waits for (the `type` of an incoming packet); replies have none.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum PacketKind {
    /// The outcome of an evaluation.
    #[serde(rename = "evaluationResult")]
    EvaluationResult,
    /// A watcher announced a target.
    #[serde(rename = "target-available-form")]
    TargetAvailable,
    /// Any other type.
    #[serde(other)]
    Other,
}

/// The target types a watcher is asked to announce.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum WatchedTargetType {
    /// Documents.
    Frame,
}

/// The parameters of a request that takes none.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub struct NoParams {}

/// The parameters of `getProcess`.
#[derive(Debug, Clone, Copy, Serialize)]
pub struct GetProcessParams {
    id: u32,
}

impl GetProcessParams {
    /// Asks for the browser's parent process.
    pub const PARENT: Self = Self {
        id: PARENT_PROCESS_ID,
    };
}

/// The parameters of `getWatcher`.
#[derive(Debug, Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetWatcherParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    is_server_target_switching_enabled: Option<bool>,
}

impl GetWatcherParams {
    /// A watcher that follows the targets it announces across switches.
    pub const SWITCHING_TARGETS: Self = Self {
        is_server_target_switching_enabled: Some(true),
    };
}

/// The parameters of `watchTargets`.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchTargetsParams {
    target_type: WatchedTargetType,
}

impl WatchTargetsParams {
    /// Announces documents.
    pub const FRAMES: Self = Self {
        target_type: WatchedTargetType::Frame,
    };
}

/// The console syntax an evaluation maps, such as top-level `await`.
#[derive(Debug, Clone, Copy, Serialize)]
struct MappedSyntax {
    #[serde(rename = "await")]
    is_awaited: bool,
}

/// The parameters of `evaluateJSAsync`.
#[derive(Debug, Clone, Copy, Serialize)]
pub struct EvaluateParams<'text> {
    text: &'text str,
    #[serde(skip_serializing_if = "Option::is_none")]
    eager: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    mapped: Option<MappedSyntax>,
}

impl<'text> EvaluateParams<'text> {
    /// Evaluates `text`; the result is whatever it returns, unawaited.
    pub const fn new(text: &'text str) -> Self {
        Self {
            text,
            eager: None,
            mapped: None,
        }
    }

    /// Asks for a real (not side-effect free preview) evaluation, said explicitly.
    #[must_use]
    pub const fn not_eager(mut self) -> Self {
        self.eager = Some(false);
        self
    }

    /// Reports the settled value of the promise the text resolves to.
    #[must_use]
    pub const fn awaiting(mut self) -> Self {
        self.mapped = Some(MappedSyntax { is_awaited: true });
        self
    }
}

#[derive(Serialize)]
struct Request<'request, P> {
    to: &'request ActorId,
    #[serde(rename = "type")]
    kind: RequestKind,
    #[serde(flatten)]
    parameters: &'request P,
}

/// Encodes the packet of one request to `to`; `parameters` must serialize to an object.
///
/// ```
/// use dev_hot::driver::rdp::message::{encode_request, ActorId, NoParams, RequestKind};
///
/// let packet = encode_request(&ActorId::root(), RequestKind::ListAddons, &NoParams {})?;
/// assert_eq!(packet, b"33:{\"to\":\"root\",\"type\":\"listAddons\"}");
/// # Ok::<(), dev_hot::Error>(())
/// ```
pub fn encode_request<P: Serialize>(
    to: &ActorId,
    kind: RequestKind,
    parameters: &P,
) -> Result<Vec<u8>> {
    encode_packet(&Request {
        to,
        kind,
        parameters,
    })
}

/// The privileged script that wakes the suspended event page of an extension.
pub fn wake_background_script(extension_id: &str) -> String {
    let id = Value::from(extension_id);
    format!("WebExtensionPolicy.getByID({id})?.extension.wakeupBackground()")
}

/// A form that names actors: a process descriptor, a process or a frame.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ActorForm {
    /// The form's own actor.
    pub actor: Option<ActorId>,
    /// The console that evaluates in it.
    pub console_actor: Option<ActorId>,
}

/// A frame target announced by a watcher.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct FrameTarget {
    /// The document's URL.
    pub url: Option<String>,
    /// The console that evaluates in it.
    pub console_actor: Option<ActorId>,
}

/// One entry of `listAddons`.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Addon {
    /// The add-on's descriptor actor.
    pub actor: Option<ActorId>,
    /// The gecko id.
    pub id: Option<String>,
    /// The display name.
    pub name: Option<String>,
    /// Where it is installed from.
    pub url: Option<String>,
    /// Whether it is gone after a restart.
    pub temporarily_installed: Option<bool>,
    /// The `moz-extension:` URL of its manifest.
    #[serde(rename = "manifestURL")]
    pub manifest_url: Option<String>,
}

#[cfg(test)]
mod tests;
