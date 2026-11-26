//! The classification of changed paths and the plan a debounce window drains into.

use dev_hot::changes::classifier::{
    classify_path, hash_installed_lockfile, plan_rebuild, InstallGate, PathClass, PathRules,
    PendingState, RebuildPlan,
};
use dev_hot::types::{ContentHash, RelPath};
use dev_hot::Result;

const MARKER: &str = "bun.lock";
const HOT: &str = "src/popup/App.svelte";

fn rules() -> PathRules {
    PathRules {
        install_marker: Some(RelPath::new(MARKER)),
        hmr_sources: [RelPath::new(HOT)].into(),
    }
}

fn class_of(path: &str) -> PathClass {
    classify_path(&rules(), &RelPath::new(path))
}

fn plan_of(paths: &[&str]) -> Option<RebuildPlan> {
    let mut state = PendingState::default();
    for path in paths {
        state.record(class_of(path));
    }
    plan_rebuild(state)
}

#[test]
fn the_install_marker_and_the_hmr_graph_are_told_from_code() {
    assert_eq!(class_of(MARKER), PathClass::InstallMarker);
    assert_eq!(class_of(HOT), PathClass::HmrSource);
    assert_eq!(class_of("src/lib/a.ts"), PathClass::Code);
    assert_eq!(class_of(".env"), PathClass::Code);
}

#[test]
fn only_hot_swappable_edits_hot_swap() {
    assert_eq!(plan_of(&[]), None);
    assert_eq!(plan_of(&[HOT, HOT]), Some(RebuildPlan::HotSwap));
}

#[test]
fn a_code_edit_cancels_a_pending_hot_swap_for_good() {
    assert_eq!(
        plan_of(&[HOT, "src/lib/a.ts", HOT]),
        Some(RebuildPlan::Full)
    );
}

#[test]
fn take_resets_the_window() {
    let mut state = PendingState::default();
    state.record(PathClass::Code);
    assert_eq!(state.take(), PendingState::Full);
    assert_eq!(state, PendingState::Idle);
}

#[test]
fn install_gate_passes_only_real_changes() {
    let mut gate = InstallGate::new(None);
    assert!(!gate.is_dependency_set_changed(None));
    assert!(gate.is_dependency_set_changed(Some(ContentHash::from_bytes(b"1"))));
}

#[test]
fn a_missing_lockfile_has_no_hash() -> Result<()> {
    let missing = std::env::temp_dir().join(format!("dev-hot-lock-{}", std::process::id()));
    assert_eq!(hash_installed_lockfile(&missing)?, None);
    Ok(())
}
