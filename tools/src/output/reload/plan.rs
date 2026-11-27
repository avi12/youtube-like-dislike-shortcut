//! Diffs two builds by content hash and turns the changed files into the smallest update that makes
//! them live in the running browser.
//!
//! Content scripts register listeners they never remove, and the background keeps the open ports in
//! memory, so neither is replaced in place: whatever is not owned by extension pages alone reloads
//! the extension, and with it every tab a content script runs in.

use std::collections::BTreeSet;
use std::fmt;
use std::path::Path;

use serde::Serialize;
use serde_json::Value;

use crate::output::error::Result;
use crate::output::manifest::{url_regex, ContentScriptWorld, ExtensionManifest, MANIFEST_FILE};
use crate::output::reload::snapshot::BuildSnapshot;

const LOCALES_DIR_PREFIX: &str = "_locales/";
const CONTENT_SCRIPTS_DIR_PREFIX: &str = "content-scripts/";
const HTML_SUFFIX: &str = ".html";
/// Only developer tools read source maps, so a changed one never asks for a reload.
const SOURCE_MAP_SUFFIX: &str = ".map";
const LIVE_LOADED_EXTENSIONS: [&str; 3] = ["html", "js", "css"];
const HASHED_ASSET_DIRS: [&str; 2] = ["chunks/", "assets/"];
const HASHED_ASSET_SUFFIXES: [&str; 2] = [".js", ".css"];
const ASSET_HASH_LENGTH: usize = 8;

/// HTML pages that changed, and shared files any open page may load.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PageRefreshPlan {
    /// HTML entrypoints whose page changed.
    pub(crate) page_names: Vec<String>,
    /// Changed files no single page owns (a public asset).
    pub(crate) shared_asset_files: Vec<String>,
}

impl fmt::Display for PageRefreshPlan {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let changed: Vec<&str> = self
            .page_names
            .iter()
            .chain(&self.shared_asset_files)
            .map(String::as_str)
            .collect();
        formatter.write_str(&changed.join(", "))
    }
}

/// One manifest content script as it is injected into the open frames.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Injection {
    pub(crate) files: Vec<String>,
    pub(crate) style_sheets: Vec<String>,
    pub(crate) world: ContentScriptWorld,
    pub(crate) is_all_frames: bool,
    /// Regular expressions of the frame URLs the script runs in.
    pub(crate) url_patterns: Vec<String>,
}

/// Reload the extension, then run every content script anew in the frames already open. Tabs are
/// never reloaded.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ExtensionReloadPlan {
    pub(crate) reasons: Vec<String>,
    pub(crate) injections: Vec<Injection>,
}

/// What a rebuild needs from the browser.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum ReloadPlan {
    /// Nothing changed.
    None,
    /// Refresh the open extension pages.
    RefreshPages(PageRefreshPlan),
    /// Reload the extension and re-inject its content scripts.
    ReloadExtension(ExtensionReloadPlan),
}

fn diff_file_hashes(before: &BuildSnapshot, after: &BuildSnapshot) -> BTreeSet<String> {
    let files = before.file_hashes.keys().chain(after.file_hashes.keys());
    files
        .filter(|file| !file.ends_with(SOURCE_MAP_SUFFIX))
        .filter(|file| before.file_hashes.get(*file) != after.file_hashes.get(*file))
        .cloned()
        .collect()
}

fn collect_strings(value: &Value, strings: &mut BTreeSet<String>) {
    match value {
        Value::String(text) => {
            strings.insert(text.strip_prefix('/').unwrap_or(text).to_owned());
        }
        Value::Array(items) => items.iter().for_each(|item| collect_strings(item, strings)),
        Value::Object(fields) => fields
            .values()
            .for_each(|field| collect_strings(field, strings)),
        Value::Null | Value::Bool(_) | Value::Number(_) => {}
    }
}

/// Read only when the extension loads: the manifest, the files it names directly (icons) and the
/// locale catalogs.
fn is_load_time_file(file: &str, manifest_strings: &BTreeSet<String>) -> bool {
    let is_manifest_or_locale = file == MANIFEST_FILE || file.starts_with(LOCALES_DIR_PREFIX);
    if is_manifest_or_locale {
        return true;
    }
    let extension = Path::new(file).extension().and_then(|text| text.to_str());
    let is_live_loaded = extension.is_some_and(|text| LIVE_LOADED_EXTENSIONS.contains(&text));
    manifest_strings.contains(file) && !is_live_loaded
}

/// Vite's content-hashed page chunks and styles: a change to one already shows as a changed page.
fn is_hashed_page_asset(file: &str) -> bool {
    let Some(body) = HASHED_ASSET_DIRS
        .iter()
        .find_map(|directory| file.strip_prefix(directory))
    else {
        return false;
    };
    let Some(stem) = HASHED_ASSET_SUFFIXES
        .iter()
        .find_map(|suffix| body.strip_suffix(suffix))
    else {
        return false;
    };
    let Some((hash_start, _)) = stem.char_indices().rev().nth(ASSET_HASH_LENGTH) else {
        return false;
    };
    let Some((head, tail)) = stem.split_at_checked(hash_start) else {
        return false;
    };
    let hash = tail.strip_prefix('-').unwrap_or_default();
    let is_word = |character: char| character.is_ascii_alphanumeric() || "_-".contains(character);
    !head.is_empty() && !hash.is_empty() && hash.chars().all(is_word)
}

fn plan_page_refresh(after: &BuildSnapshot, changed: &BTreeSet<String>) -> PageRefreshPlan {
    let page_names = changed
        .iter()
        .filter(|file| after.file_hashes.contains_key(*file))
        .filter_map(|file| file.strip_suffix(HTML_SUFFIX))
        .map(|stem| stem.rsplit('/').next().unwrap_or(stem).to_owned())
        .collect();
    let shared_asset_files = changed
        .iter()
        .filter(|file| !file.ends_with(HTML_SUFFIX) && !is_hashed_page_asset(file))
        .cloned()
        .collect();
    PageRefreshPlan {
        page_names,
        shared_asset_files,
    }
}

/// Why the changed files need the extension reloaded; empty when only pages see them.
fn list_reload_reasons(after: &BuildSnapshot, changed: &BTreeSet<String>) -> Result<Vec<String>> {
    let mut manifest_strings = BTreeSet::new();
    collect_strings(&after.manifest.0, &mut manifest_strings);
    let background_files = after.manifest.background_files()?;
    let mut reasons = Vec::new();
    if changed.iter().any(|file| background_files.contains(file)) {
        reasons.push("background changed".to_owned());
    }
    let named = |is_wanted: &dyn Fn(&str) -> bool| -> Vec<&str> {
        changed
            .iter()
            .map(String::as_str)
            .filter(|file| is_wanted(file))
            .collect()
    };
    let content_files = named(&|file| file.starts_with(CONTENT_SCRIPTS_DIR_PREFIX));
    if !content_files.is_empty() {
        reasons.push(format!("{} changed", content_files.join(", ")));
    }
    let load_time_files = named(&|file| is_load_time_file(file, &manifest_strings));
    let unlisted: Vec<&str> = load_time_files
        .into_iter()
        .filter(|file| !content_files.contains(file))
        .collect();
    if !unlisted.is_empty() {
        reasons.push(format!("{} changed", unlisted.join(", ")));
    }
    Ok(reasons)
}

/// The smallest update that makes the changes between two builds live.
pub(crate) fn plan_reload(before: &BuildSnapshot, after: &BuildSnapshot) -> Result<ReloadPlan> {
    let changed = diff_file_hashes(before, after);
    if changed.is_empty() {
        return Ok(ReloadPlan::None);
    }
    let reasons = list_reload_reasons(after, &changed)?;
    if reasons.is_empty() {
        return Ok(ReloadPlan::RefreshPages(plan_page_refresh(after, &changed)));
    }
    Ok(ReloadPlan::ReloadExtension(ExtensionReloadPlan {
        reasons,
        injections: list_injections(&after.manifest)?,
    }))
}

/// Every content script of a manifest.
pub(crate) fn list_injections(manifest: &ExtensionManifest) -> Result<Vec<Injection>> {
    Ok(manifest
        .content_scripts()?
        .into_iter()
        .map(|script| Injection {
            url_patterns: script
                .matches
                .iter()
                .map(|pattern| url_regex(pattern))
                .collect(),
            files: script.scripts,
            style_sheets: script.style_sheets,
            world: script.world,
            is_all_frames: script.is_all_frames,
        })
        .collect())
}

#[cfg(test)]
mod tests;
