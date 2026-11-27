use serde_json::json;

use crate::output::manifest::ExtensionManifest;
use crate::output::reload::plan::*;

const BASE_FILES: [(&str, &str); 7] = [
    ("manifest.json", "1"),
    ("background.js", "1"),
    ("popup.html", "1"),
    ("chunks/popup-AbCd1234.js", "1"),
    ("content-scripts/a.js", "1"),
    ("content-scripts/a.css", "1"),
    ("icon-16.png", "1"),
];

fn snapshot(overrides: &[(&str, &str)]) -> BuildSnapshot {
    let file_hashes = BASE_FILES
        .iter()
        .chain(overrides)
        .map(|(file, hash)| ((*file).to_owned(), (*hash).to_owned()))
        .collect();
    let manifest = ExtensionManifest(json!({
        "icons": {"16": "icon-16.png"},
        "background": {"service_worker": "background.js"},
        "content_scripts": [{"js": ["content-scripts/a.js"], "matches": ["*://x/*"]}]
    }));
    BuildSnapshot {
        file_hashes,
        manifest,
    }
}

fn plan_for(changes: &[(&str, &str)]) -> Result<ReloadPlan> {
    plan_reload(&snapshot(&[]), &snapshot(changes))
}

fn reasons_for(changes: &[(&str, &str)]) -> Result<Vec<String>> {
    Ok(match plan_for(changes)? {
        ReloadPlan::ReloadExtension(plan) => plan.reasons,
        ReloadPlan::None | ReloadPlan::RefreshPages(_) => Vec::new(),
    })
}

#[test]
fn identical_builds_need_nothing() -> Result<()> {
    assert_eq!(plan_for(&[])?, ReloadPlan::None);
    Ok(())
}

#[test]
fn a_source_map_alone_needs_nothing() -> Result<()> {
    assert_eq!(plan_for(&[("background.js.map", "2")])?, ReloadPlan::None);
    Ok(())
}

#[test]
fn a_page_change_refreshes_only_that_page() -> Result<()> {
    let plan = plan_for(&[("popup.html", "2"), ("chunks/popup-AbCd1234.js", "2")])?;
    assert_eq!(
        plan,
        ReloadPlan::RefreshPages(PageRefreshPlan {
            page_names: vec!["popup".to_owned()],
            shared_asset_files: Vec::new(),
        })
    );
    Ok(())
}

#[test]
fn an_unnamed_public_asset_refreshes_the_pages() -> Result<()> {
    let ReloadPlan::RefreshPages(refresh) = plan_for(&[("art.png", "2")])? else {
        return Err(crate::output::error::OutputError::Invalid(
            "no refresh".to_owned(),
        ));
    };
    assert_eq!(refresh.shared_asset_files, ["art.png"]);
    Ok(())
}

#[test]
fn a_background_change_reloads_the_extension_and_reinjects_the_scripts() -> Result<()> {
    let plan = plan_for(&[("background.js", "2")])?;
    assert_eq!(
        plan,
        ReloadPlan::ReloadExtension(ExtensionReloadPlan {
            reasons: vec!["background changed".to_owned()],
            injections: list_injections(&snapshot(&[]).manifest)?,
        })
    );
    Ok(())
}

#[test]
fn a_content_script_or_its_style_reloads_the_extension() -> Result<()> {
    assert_eq!(
        reasons_for(&[("content-scripts/a.css", "2")])?,
        ["content-scripts/a.css changed"]
    );
    assert_eq!(
        reasons_for(&[("content-scripts/a.js", "2"), ("popup.html", "2")])?,
        ["content-scripts/a.js changed"]
    );
    Ok(())
}

#[test]
fn load_time_files_reload_the_extension() -> Result<()> {
    assert_eq!(
        reasons_for(&[("icon-16.png", "2")])?,
        ["icon-16.png changed"]
    );
    assert_eq!(
        reasons_for(&[("manifest.json", "2")])?,
        ["manifest.json changed"]
    );
    assert_eq!(
        reasons_for(&[("_locales/en/messages.json", "2")])?,
        ["_locales/en/messages.json changed"]
    );
    Ok(())
}

#[test]
fn only_hashed_chunks_count_as_page_assets() {
    assert!(is_hashed_page_asset("chunks/popup-AbCd1234.js"));
    assert!(is_hashed_page_asset("assets/popup-Dm_n-PkZ.css"));
    assert!(!is_hashed_page_asset("chunks/popup.js"));
    assert!(!is_hashed_page_asset("images/popup-AbCd1234.js"));
}
