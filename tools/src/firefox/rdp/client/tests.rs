use serde_json::json;

use crate::firefox::rdp::client::*;

#[test]
fn a_message_needs_a_string_sender() {
    assert!(Message::from_value(json!({"from": "root"})).is_some());
    assert!(Message::from_value(json!({"from": 3})).is_none());
}
