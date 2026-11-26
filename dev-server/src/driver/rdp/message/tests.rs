use serde_json::json;

use crate::driver::rdp::message::*;
use crate::driver::rdp::PacketDecoder;

fn sent<P: Serialize>(kind: RequestKind, parameters: &P) -> Result<Vec<Value>> {
    PacketDecoder::default().push(&encode_request(&ActorId::new("a1"), kind, parameters)?)
}

#[test]
fn requests_keep_their_wire_shape() -> Result<()> {
    assert_eq!(
        sent(RequestKind::GetProcess, &GetProcessParams::PARENT)?,
        [json!({"to":"a1","type":"getProcess","id":0})]
    );
    assert_eq!(
        sent(
            RequestKind::GetWatcher,
            &GetWatcherParams::SWITCHING_TARGETS
        )?,
        [json!({"to":"a1","type":"getWatcher","isServerTargetSwitchingEnabled":true})]
    );
    assert_eq!(
        sent(RequestKind::GetWatcher, &GetWatcherParams::default())?,
        [json!({"to":"a1","type":"getWatcher"})]
    );
    assert_eq!(
        sent(RequestKind::WatchTargets, &WatchTargetsParams::FRAMES)?,
        [json!({"to":"a1","type":"watchTargets","targetType":"frame"})]
    );
    let evaluation = EvaluateParams::new("x").not_eager().awaiting();
    assert_eq!(
        sent(RequestKind::EvaluateJsAsync, &evaluation)?,
        [json!({
            "to":"a1","type":"evaluateJSAsync","text":"x","eager":false,"mapped":{"await":true}
        })]
    );
    Ok(())
}

#[test]
fn an_addon_reply_keeps_known_fields_and_ignores_the_rest() -> Result<()> {
    let addons: Vec<Addon> =
        serde_json::from_value(json!([{"actor": "a", "id": "x@y", "isSystem": false,
            "manifestURL": "moz-extension://u/manifest.json", "temporarilyInstalled": true}]))?;
    let manifest = addons
        .first()
        .and_then(|addon| addon.manifest_url.as_deref());
    assert_eq!(manifest, Some("moz-extension://u/manifest.json"));
    Ok(())
}

#[test]
fn the_wake_script_quotes_the_id() {
    assert_eq!(
        wake_background_script("a@b"),
        "WebExtensionPolicy.getByID(\"a@b\")?.extension.wakeupBackground()"
    );
}
