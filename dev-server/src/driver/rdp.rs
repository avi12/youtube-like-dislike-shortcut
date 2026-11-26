//! The wire format of Firefox's Remote Debugging Protocol: the `<length>:<json>` framing and the
//! typed requests and replies.

pub mod message;
mod packet;

pub use self::packet::{encode_packet, PacketDecoder};
