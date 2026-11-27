//! What runs inside the browser - the HMR runtime and the loaders - and the dev patches that point a
//! build at them. None of it ships: `wxt build` and `wxt zip` never see it.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;

use serde::Serialize;
use serde_json::{json, Value};

use crate::dev::hmr::{
    EntryKind, Entrypoint, HMR_MANIFEST_PATH, HMR_OUT_SUBDIR, HMR_PAGE_LOADER_FILE,
    HMR_RUNTIME_FILE,
};
use crate::output::error::{OutputError, Result};
use crate::output::manifest::{ExtensionManifest, ManifestList};
use dev_hot::types::ContentHash;

const RUNTIME: &str = include_str!("../../assets/payload/runtime.js");
const PAGE_LOADER: &str = include_str!("../../assets/payload/page-loader.js");
const CONTENT_LOADER: &str = include_str!("../../assets/payload/content-loader.js");
const TEARDOWN_REGISTRY: &str = include_str!("../../assets/payload/teardown-registry.js");
/// What re-injecting the content scripts into open frames needs, added to dev builds only.
const REINJECTION_PERMISSIONS: [&str; 2] = ["scripting", "webNavigation"];
const CONTENT_SCRIPTS_PREFIX: &str = "content-scripts/";
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

/// Puts a hot content script's loader in place of its bundle, and its global styles in place of its
/// static stylesheet.
fn patch_content_script(
    output_directory: &Path,
    entry: &Entrypoint,
    static_style: &str,
) -> Result<()> {
    let path = output_directory.join(&entry.built_file);
    let original = read_text(&path)?;
    write_text(&path, &content_loader_source(&entry.name, &original))?;
    let style_path = path.with_extension("css");
    if style_path.is_file() {
        write_text(&style_path, static_style)?;
    }
    Ok(())
}

/// The teardown registry, then the script, run only where it is not running yet. The last value is
/// `undefined`: injection would otherwise wait for the promise a script ends in, which may never
/// settle.
fn guarded_source(name: &str, source: &str) -> String {
    let name = Value::from(name);
    format!(
        "{TEARDOWN_REGISTRY}if (globalThis.devtoolRegistry.begin({name})) {{\n{source}\n}}\n;undefined;\n"
    )
}

/// Wraps every content script, of both worlds, so a newer build can undo it and run in its place.
fn guard_content_scripts(output_directory: &Path, manifest: &ExtensionManifest) -> Result<()> {
    let files: BTreeSet<String> = manifest
        .content_scripts()?
        .into_iter()
        .flat_map(|script| script.scripts)
        .collect();
    for file in files {
        let path = output_directory.join(&file);
        let name = file
            .strip_prefix(CONTENT_SCRIPTS_PREFIX)
            .unwrap_or(&file)
            .trim_end_matches(".js");
        write_text(&path, &guarded_source(name, &read_text(&path)?))?;
    }
    Ok(())
}

/// A match pattern narrowed to its origin, the only paths `web_accessible_resources` accepts.
fn origin_pattern(pattern: &str) -> String {
    let Some((scheme, rest)) = pattern.split_once("://") else {
        return pattern.to_owned();
    };
    let host = rest.split_once('/').map_or(rest, |(host, _)| host);
    format!("{scheme}://{host}/*")
}

/// The permissions re-injection needs, and the HMR modules made importable by the pages the hot
/// content scripts run on.
fn patch_manifest(manifest: &mut ExtensionManifest, hot_entries: &[Entrypoint]) -> Result<()> {
    let mut hot_origins: Vec<Value> = Vec::new();
    let mut origins: Vec<Value> = Vec::new();
    for script in manifest.content_scripts()? {
        let is_hot = hot_entries.iter().any(|entry| {
            entry.kind == EntryKind::ContentScript && script.scripts.contains(&entry.built_file)
        });
        for pattern in &script.matches {
            let origin = Value::from(origin_pattern(pattern));
            let is_new_hot_origin = is_hot && !hot_origins.contains(&origin);
            if is_new_hot_origin {
                hot_origins.push(origin.clone());
            }
            origins.push(origin);
        }
    }
    let permissions = REINJECTION_PERMISSIONS.map(Value::from).to_vec();
    manifest.extend_list(ManifestList::Permissions, permissions)?;
    manifest.extend_list(ManifestList::HostPermissions, origins)?;
    if hot_origins.is_empty() {
        return Ok(());
    }
    let resources = json!({
        "resources": [format!("{HMR_OUT_SUBDIR}/*")],
        "matches": hot_origins,
    });
    manifest.extend_list(ManifestList::WebAccessibleResources, vec![resources])
}

/// Runs once after every extension build: points the hot entrypoints at their HMR modules, makes
/// every content script replaceable and adds the dev permissions.
pub(crate) fn patch_built_output(
    output_directory: &Path,
    hot_entries: &[Entrypoint],
    static_styles: &BTreeMap<String, String>,
) -> Result<()> {
    for entry in hot_entries {
        match entry.kind {
            EntryKind::Page => patch_page(output_directory, entry)?,
            EntryKind::ContentScript => {
                let style = static_styles.get(&entry.name).map_or("", String::as_str);
                patch_content_script(output_directory, entry, style)?;
            }
            EntryKind::Cold => {}
        }
    }
    let mut manifest = ExtensionManifest::read(output_directory)?;
    guard_content_scripts(output_directory, &manifest)?;
    patch_manifest(&mut manifest, hot_entries)?;
    manifest.write(output_directory)
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

    #[test]
    fn a_guarded_script_never_ends_in_its_own_promise() {
        let source = guarded_source(
            "watcher",
            "var main = run();
main;",
        );
        assert!(source.contains(r#"devtoolRegistry.begin("watcher")"#));
        assert!(source.ends_with(
            "}
;undefined;
"
        ));
    }

    #[test]
    fn dev_builds_may_inject_into_every_frame_a_content_script_matches() -> Result<()> {
        let mut manifest = ExtensionManifest(json!({
            "permissions": ["storage"],
            "content_scripts": [{"js": ["content-scripts/a.js"], "matches": ["*://x/embed/*"]}]
        }));
        patch_manifest(&mut manifest, &[])?;
        assert_eq!(
            manifest.0.pointer("/permissions"),
            Some(&json!(["storage", "scripting", "webNavigation"]))
        );
        assert_eq!(
            manifest.0.pointer("/host_permissions"),
            Some(&json!(["*://x/*"]))
        );
        assert_eq!(manifest.0.pointer("/web_accessible_resources"), None);
        Ok(())
    }
}
