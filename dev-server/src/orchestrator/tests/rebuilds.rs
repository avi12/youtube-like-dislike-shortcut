//! What each kind of edit makes the loop do.

use std::time::Duration;

use tokio::time::sleep;

use super::harness::{start, HOT_FILE, INSTALL_MARKER};
use crate::orchestrator::SWAP_SETTLE;
use crate::types::ContentHash;

const CODE_FILE: &str = "src/lib/a.ts";

#[tokio::test(start_paused = true)]
async fn an_hmr_graph_edit_hot_swaps_then_catches_the_bundle_up() {
    let harness = start(|_| {}).await;
    harness.touch(&[HOT_FILE]).await;
    harness.settle().await;
    assert_eq!(harness.log.entries(), ["rebuildHmr", "build", "rebuildHmr"]);
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn the_next_hot_swap_follows_the_new_graph() {
    let harness = start(|_| {}).await;
    harness.touch(&[HOT_FILE]).await;
    harness.settle().await;
    harness.touch(&["src/graph.svelte"]).await;
    sleep(Duration::from_millis(1)).await;
    assert_eq!(harness.log.count("apply"), 0);
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn an_hmr_graph_edit_without_a_build_output_rebuilds_in_full() {
    let harness = start(|disk| disk.is_output_missing = true).await;
    harness.touch(&[HOT_FILE]).await;
    harness.settle().await;
    assert_eq!(harness.log.entries(), ["build", "rebuildHmr", "apply"]);
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn a_build_the_pages_cannot_take_in_place_is_applied_in_full() {
    let harness = start(|disk| disk.reload_reasons.push_back("styles changed".to_owned())).await;
    harness.touch(&[HOT_FILE]).await;
    harness.settle().await;
    assert_eq!(
        harness.log.entries(),
        ["rebuildHmr", "build", "rebuildHmr", "apply"]
    );
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn a_code_edit_builds_then_applies() {
    let harness = start(|_| {}).await;
    harness.touch(&[CODE_FILE, HOT_FILE]).await;
    harness.settle().await;
    assert_eq!(harness.log.entries(), ["build", "rebuildHmr", "apply"]);
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn an_update_waits_out_the_tail_of_a_hot_swap() {
    let harness = start(|_| {}).await;
    harness.touch(&[HOT_FILE]).await;
    sleep(Duration::from_millis(1)).await;
    harness.touch(&[CODE_FILE]).await;
    harness.settle().await;
    let waited = harness
        .log
        .time_of("apply", 0)
        .duration_since(harness.log.time_of("rebuildHmr", 0));
    assert!(waited >= SWAP_SETTLE, "waited {waited:?}");
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn a_failed_build_applies_nothing() {
    let harness = start(|disk| disk.build_failures.push_back("syntax error".to_owned())).await;
    harness.touch(&[CODE_FILE]).await;
    harness.settle().await;
    assert_eq!(harness.log.entries(), ["build"]);
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn only_a_changed_dependency_set_rebuilds_on_the_install_marker() {
    let harness = start(|disk| disk.lockfile = Some(ContentHash::from_bytes(b"a"))).await;
    harness.touch(&[INSTALL_MARKER]).await;
    harness.settle().await;
    assert_eq!(harness.log.count("build"), 0);
    harness.disk.lock().unwrap().lockfile = Some(ContentHash::from_bytes(b"b"));
    harness.touch(&[INSTALL_MARKER]).await;
    harness.settle().await;
    assert_eq!(harness.log.entries(), ["build", "rebuildHmr", "apply"]);
    harness.stop().await;
}
