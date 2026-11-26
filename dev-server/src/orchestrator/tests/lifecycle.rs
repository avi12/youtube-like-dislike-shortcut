//! Retries and shutdown.

use super::harness::start;

#[tokio::test(start_paused = true)]
async fn a_transient_file_lock_retries_the_build() {
    let harness = start(|disk| disk.build_failures.push_back("EBUSY: locked".to_owned())).await;
    harness.touch(&["src/lib/a.ts"]).await;
    harness.settle().await;
    assert_eq!(
        harness.log.entries(),
        ["build", "build", "rebuildHmr", "apply"]
    );
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn shutdown_ends_the_loop_cleanly() {
    let harness = start(|_| {}).await;
    harness.stop().await;
}

#[tokio::test(start_paused = true)]
async fn a_closed_watcher_ends_the_loop() {
    let harness = start(|_| {}).await;
    drop(harness.changes);
    harness.task.await.unwrap();
}
