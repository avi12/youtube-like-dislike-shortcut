//! The JavaScript the targets evaluate inside the browser, built from the `.js` assets under
//! `assets/browsers/`. Each asset is one function expression called with JSON config.

use serde::Serialize;

use crate::output::reload::{ExtensionReloadPlan, PageRefreshPlan};

const TAB_RELOAD: &str = include_str!("../../../assets/browsers/tab-reload.js");
const PAGE_REFRESH: &str = include_str!("../../../assets/browsers/page-refresh.js");
const EXTENSION_RELOAD: &str = include_str!("../../../assets/browsers/extension-reload.js");
const EXTENSION_ID_BY_NAME: &str = include_str!("../../../assets/browsers/extension-id-by-name.js");
/// Reloads the extension from inside its background.
pub(super) const RUNTIME_RELOAD: &str =
    include_str!("../../../assets/browsers/expressions/runtime-reload.js");

fn invoke(function: &str, argument: &impl Serialize) -> serde_json::Result<String> {
    let function = function.trim().trim_end_matches(';');
    Ok(format!(
        "({function})({})",
        serde_json::to_string(argument)?
    ))
}

/// Reloads an extension from the extensions page, which needs no live worker.
pub(super) fn extension_reload(extension_id: &str) -> serde_json::Result<String> {
    invoke(EXTENSION_RELOAD, &extension_id)
}

/// Resolves to the id of the installed extension with this manifest name, or null.
pub(super) fn extension_id_by_name(name: &str) -> serde_json::Result<String> {
    invoke(EXTENSION_ID_BY_NAME, &name)
}

/// Run in the Firefox background: reloads the tabs a content script runs in.
pub(super) fn tab_reload(plan: &ExtensionReloadPlan) -> serde_json::Result<String> {
    invoke(TAB_RELOAD, &plan.tab_patterns)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PageRefreshConfig<'plan> {
    page_names: &'plan [String],
    is_shared_asset_changed: bool,
}

/// Run in the Firefox background: reloads the open views of the changed pages.
pub(super) fn page_refresh(plan: &PageRefreshPlan) -> serde_json::Result<String> {
    invoke(
        PAGE_REFRESH,
        &PageRefreshConfig {
            page_names: &plan.page_names,
            is_shared_asset_changed: !plan.shared_asset_files.is_empty(),
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_script_is_the_asset_called_with_its_json_argument() -> serde_json::Result<()> {
        let source = page_refresh(&PageRefreshPlan {
            page_names: vec!["popup".to_owned()],
            shared_asset_files: Vec::new(),
        })?;
        assert!(source.starts_with("(async ({ pageNames"));
        assert!(source.ends_with(r#"({"pageNames":["popup"],"isSharedAssetChanged":false})"#));
        Ok(())
    }
}
