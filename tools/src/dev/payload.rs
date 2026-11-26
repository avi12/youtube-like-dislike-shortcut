//! What runs inside the browser - the HMR runtime and the loaders - and the dev patches that point a
//! build at them. None of it ships: `wxt build` and `wxt zip` never see it.

use std::fs;
use std::path::Path;

use serde::Serialize;
use serde_json::{json, Value};

use crate::dev::hmr::{
    EntryKind, Entrypoint, HMR_MANIFEST_PATH, HMR_OUT_SUBDIR, HMR_PAGE_LOADER_FILE,
    HMR_RUNTIME_FILE,
};
use crate::output::error::{OutputError, Result};
use crate::output::manifest::ExtensionManifest;
use dev_hot::types::ContentHash;

const RUNTIME: &str = include_str!("../../assets/payload/runtime.js");
const PAGE_LOADER: &str = include_str!("../../assets/payload/page-loader.js");
const CONTENT_LOADER: &str = include_str!("../../assets/payload/content-loader.js");
const POLL_INTERVAL_MS: u32 = 250;
const SCRIPT_OPEN: &str = "<script";
const SCRIPT_CLOSE: &str = "</script>";
const LINK_OPEN: &str = "<link";
const MODULE_SCRIPT_TYPE: &str = "type=\"module\"";
const STYLESHEET_RELATION: &str = "rel=\"stylesheet\"";
const BODY_CLOSE: &str = "</body>";

/// What `runtime.js` reads from its generated `HMR_CONFIG` header.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PayloadConfig {
    /// Extension-relative path of the HMR manifest the runtime polls.
    manifest_path: &'static str,
    /// How often the runtime re-reads the manifest.
    poll_interval_ms: u32,
}

/// The page and content-script runtime, with its `HMR_CONFIG` header.
pub(crate) fn runtime_source() -> serde_json::Result<String> {
    let header = serde_json::to_string(&PayloadConfig {
        manifest_path: HMR_MANIFEST_PATH,
        poll_interval_ms: POLL_INTERVAL_MS,
    })?;
    Ok(format!("const HMR_CONFIG = {header};\n{RUNTIME}"))
}

fn fill(template: &str, values: &[(&str, &str)]) -> String {
    values
        .iter()
        .fold(template.to_owned(), |source, (name, value)| {
            let literal = Value::from(*value).to_string();
            source.replace(&format!("\"@@{name}@@\""), &literal)
        })
}

/// The module a hot page loads instead of its built script: the runtime, then the entry.
pub(crate) fn page_loader_source(entry: &str, entry_url: &str) -> String {
    fill(
        PAGE_LOADER,
        &[
            (
                "RUNTIME_PATH",
                &format!("/{HMR_OUT_SUBDIR}/{HMR_RUNTIME_FILE}"),
            ),
            ("ENTRY", entry),
            ("ENTRY_PATH", &format!("/{entry_url}")),
        ],
    )
}

/// The classic script that replaces a hot content script: it imports the runtime and the HMR build
/// of the entry, and starts it.
fn content_loader_source(entry: &str, original: &str) -> String {
    let source = fill(
        CONTENT_LOADER,
        &[
            (
                "RUNTIME_PATH",
                &format!("{HMR_OUT_SUBDIR}/{HMR_RUNTIME_FILE}"),
            ),
            ("MANIFEST_PATH", HMR_MANIFEST_PATH),
            ("ENTRY", entry),
        ],
    );
    // The hash of the bundle it replaces, so a rebuild that changed the bundle changes this file
    let hash = ContentHash::from_bytes(original.as_bytes());
    format!("{source}// {}\n", hash.as_str())
}

/// Removes every `<script type="module">` with a source and every linked stylesheet: the loader
/// brings the HMR build's own.
fn strip_built_references(html: &str) -> String {
    let mut kept = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(start) = rest.find('<') {
        let (before, from_tag) = rest.split_at(start);
        kept.push_str(before);
        let Some(end) = from_tag.find('>') else {
            rest = from_tag;
            break;
        };
        let (tag, tail) = from_tag.split_at(end + 1);
        let is_module_script = tag.starts_with(SCRIPT_OPEN)
            && tag.contains(MODULE_SCRIPT_TYPE)
            && tail.starts_with(SCRIPT_CLOSE);
        if is_module_script {
            rest = tail.strip_prefix(SCRIPT_CLOSE).unwrap_or(tail);
            continue;
        }
        if !(tag.starts_with(LINK_OPEN) && tag.contains(STYLESHEET_RELATION)) {
            kept.push_str(tag);
        }
        rest = tail;
    }
    kept.push_str(rest);
    kept
}

fn read_text(path: &Path) -> Result<String> {
    fs::read_to_string(path).map_err(OutputError::with_path(path))
}

fn write_text(path: &Path, text: &str) -> Result<()> {
    fs::write(path, text).map_err(OutputError::with_path(path))
}

fn patch_page(output_directory: &Path, entry: &Entrypoint) -> Result<()> {
    let path = output_directory.join(&entry.built_file);
    let original = read_text(&path)?;
    let loader_tag = format!(
        "<script type=\"module\" src=\"/{HMR_OUT_SUBDIR}/{}/{HMR_PAGE_LOADER_FILE}\"></script>",
        entry.name
    );
    let patched = strip_built_references(&original).replacen(
        BODY_CLOSE,
        &format!("{loader_tag}{BODY_CLOSE}"),
        1,
    );
    // The hash changes the file whenever the page it replaces changed
    let hash = ContentHash::from_bytes(original.as_bytes());
    write_text(&path, &format!("{patched}<!-- {} -->\n", hash.as_str()))
}

fn patch_content_script(output_directory: &Path, entry: &Entrypoint) -> Result<()> {
    let path = output_directory.join(&entry.built_file);
    let original = read_text(&path)?;
    write_text(&path, &content_loader_source(&entry.name, &original))
}

/// A match pattern narrowed to its origin, the only paths `web_accessible_resources` accepts.
fn origin_pattern(pattern: &str) -> String {
    let Some((scheme, rest)) = pattern.split_once("://") else {
        return pattern.to_owned();
    };
    let host = rest.split_once('/').map_or(rest, |(host, _)| host);
    format!("{scheme}://{host}/*")
}

/// Makes the HMR modules importable by the pages the hot content scripts run on.
fn expose_modules(output_directory: &Path, hot_entries: &[Entrypoint]) -> Result<()> {
    let mut manifest = ExtensionManifest::read(output_directory)?;
    let mut matches: Vec<String> = Vec::new();
    for script in manifest.content_scripts()? {
        let is_hot = hot_entries.iter().any(|entry| {
            entry.kind == EntryKind::ContentScript && script.scripts.contains(&entry.built_file)
        });
        if !is_hot {
            continue;
        }
        for pattern in script.matches {
            let origin = origin_pattern(&pattern);
            if !matches.contains(&origin) {
                matches.push(origin);
            }
        }
    }
    if matches.is_empty() {
        return Ok(());
    }
    manifest.add_web_accessible_resource(json!({
        "resources": [format!("{HMR_OUT_SUBDIR}/*")],
        "matches": matches,
    }))?;
    manifest.write(output_directory)
}

/// Runs once after every extension build: points the hot entrypoints at their HMR modules.
pub(crate) fn patch_built_output(
    output_directory: &Path,
    hot_entries: &[Entrypoint],
) -> Result<()> {
    for entry in hot_entries {
        match entry.kind {
            EntryKind::Page => patch_page(output_directory, entry)?,
            EntryKind::ContentScript => patch_content_script(output_directory, entry)?,
            EntryKind::Cold => {}
        }
    }
    expose_modules(output_directory, hot_entries)
}

#[cfg(test)]
mod tests {
    use crate::dev::payload::*;

    #[test]
    fn module_scripts_and_stylesheets_are_stripped() {
        let html = r#"<head><script type="module" crossorigin src="a.js"></script><script src="b.js"></script><link rel="stylesheet" href="c.css"><link rel="icon" href="d.png"></head>"#;
        assert_eq!(
            strip_built_references(html),
            r#"<head><script src="b.js"></script><link rel="icon" href="d.png"></head>"#
        );
    }

    #[test]
    fn resource_matches_keep_only_the_origin() {
        assert_eq!(
            origin_pattern("https://www.youtube.com/embed/*"),
            "https://www.youtube.com/*"
        );
        assert_eq!(origin_pattern("<all_urls>"), "<all_urls>");
    }

    #[test]
    fn the_loaders_have_their_placeholders_filled() -> serde_json::Result<()> {
        let page = page_loader_source("popup", "hmr/popup/main.js");
        let content = content_loader_source("watcher", "original");
        assert!(page.contains(r#""/hmr/popup/main.js""#));
        assert!(content.contains(r#""watcher""#));
        assert!(!format!("{page}{content}").contains("@@"));
        assert!(runtime_source()?.starts_with("const HMR_CONFIG = {\"manifestPath\""));
        Ok(())
    }
}
