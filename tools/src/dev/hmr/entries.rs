//! The extension's entrypoints, read from the built output: what the manifest and the built pages
//! name, matched to their sources by WXT's naming conventions.

use std::fs;
use std::path::Path;

use regex::Regex;

use super::error::{HmrError, Result};
use crate::output::manifest::{ContentScriptWorld, ExtensionManifest};

const ENTRYPOINTS_DIR: &str = "src/entrypoints";
const CONTENT_SCRIPTS_PREFIX: &str = "content-scripts/";
const BACKGROUND_NAME: &str = "background";
const HTML_SUFFIX: &str = ".html";
const SCRIPT_SUFFIX: &str = ".js";
const PAGE_SCRIPT: &str = r#"<script[^>]*\ssrc="([^"]+)""#;

/// What kind of entrypoint this is.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum EntryKind {
    /// An HTML page whose script mounts components.
    Page,
    /// A content script in the isolated world.
    ContentScript,
    /// Code that is never swapped: the background and page-world content scripts.
    Cold,
}

/// One entrypoint of the build.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct Entrypoint {
    /// WXT's entrypoint name.
    pub(crate) name: String,
    pub(crate) kind: EntryKind,
    /// The project-relative source module.
    pub(crate) source_path: String,
    /// The file of the build output it became.
    pub(crate) built_file: String,
}

fn first_existing(project_root: &Path, candidates: &[String]) -> Result<String> {
    candidates
        .iter()
        .find(|candidate| project_root.join(candidate).is_file())
        .cloned()
        .ok_or_else(|| {
            HmrError::Entrypoint(format!("no source found among {}", candidates.join(", ")))
        })
}

fn script_source(project_root: &Path, name: &str, directory_suffix: &str) -> Result<String> {
    let base = format!("{ENTRYPOINTS_DIR}/{name}");
    let candidates = [
        format!("{base}{directory_suffix}.ts"),
        format!("{base}{directory_suffix}/index.ts"),
        format!("{base}{directory_suffix}.js"),
        format!("{base}{directory_suffix}/index.js"),
    ];
    first_existing(project_root, &candidates)
}

/// The module a page's HTML source loads.
fn page_source(project_root: &Path, name: &str) -> Result<String> {
    let base = format!("{ENTRYPOINTS_DIR}/{name}");
    let html_path = first_existing(
        project_root,
        &[format!("{base}/index.html"), format!("{base}.html")],
    )?;
    let path = project_root.join(&html_path);
    let html = fs::read_to_string(&path).map_err(|source| HmrError::Read { path, source })?;
    let script = Regex::new(PAGE_SCRIPT)?
        .captures(&html)
        .and_then(|captures| captures.get(1))
        .ok_or_else(|| HmrError::Entrypoint(format!("{html_path} loads no script")))?;
    let directory = html_path
        .rsplit_once('/')
        .map_or(ENTRYPOINTS_DIR, |(directory, _)| directory);
    let relative = script.as_str().trim_start_matches("./");
    Ok(format!("{directory}/{relative}"))
}

fn content_entries(project_root: &Path, manifest: &ExtensionManifest) -> Result<Vec<Entrypoint>> {
    let mut entries: Vec<Entrypoint> = Vec::new();
    for script in manifest.content_scripts()? {
        for file in &script.scripts {
            let Some(name) = file
                .strip_prefix(CONTENT_SCRIPTS_PREFIX)
                .and_then(|rest| rest.strip_suffix(SCRIPT_SUFFIX))
            else {
                continue;
            };
            if entries.iter().any(|entry| entry.name == name) {
                continue;
            }
            let kind = match script.world {
                ContentScriptWorld::Isolated => EntryKind::ContentScript,
                ContentScriptWorld::Main => EntryKind::Cold,
            };
            entries.push(Entrypoint {
                name: name.to_owned(),
                kind,
                source_path: script_source(project_root, name, ".content")?,
                built_file: file.clone(),
            });
        }
    }
    Ok(entries)
}

fn page_entries(project_root: &Path, output_dir: &Path) -> Result<Vec<Entrypoint>> {
    let listing = fs::read_dir(output_dir).map_err(|source| HmrError::Read {
        path: output_dir.to_owned(),
        source,
    })?;
    let mut entries = Vec::new();
    for entry in listing {
        let file = entry?.file_name().to_string_lossy().into_owned();
        let Some(name) = file.strip_suffix(HTML_SUFFIX) else {
            continue;
        };
        entries.push(Entrypoint {
            name: name.to_owned(),
            kind: EntryKind::Page,
            source_path: page_source(project_root, name)?,
            built_file: file.clone(),
        });
    }
    entries.sort_by(|first, second| first.name.cmp(&second.name));
    Ok(entries)
}

/// Every entrypoint of the build in `output_dir`.
pub(crate) fn discover(project_root: &Path, output_dir: &Path) -> Result<Vec<Entrypoint>> {
    let manifest = ExtensionManifest::read(output_dir)?;
    let mut entries = content_entries(project_root, &manifest)?;
    entries.extend(page_entries(project_root, output_dir)?);
    if let Some(built_file) = manifest.background_files()?.into_iter().next() {
        entries.push(Entrypoint {
            name: BACKGROUND_NAME.to_owned(),
            kind: EntryKind::Cold,
            source_path: script_source(project_root, BACKGROUND_NAME, "")?,
            built_file,
        });
    }
    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(root: &Path, file: &str, content: &str) -> Result<()> {
        let path = root.join(file);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        Ok(fs::write(path, content)?)
    }

    #[test]
    fn entrypoints_follow_the_built_manifest() -> Result<()> {
        let root = std::env::temp_dir().join(format!("devtool-entries-{}", std::process::id()));
        let manifest = r#"{"background": {"service_worker": "background.js"}, "content_scripts": [
            {"js": ["content-scripts/a.js", "content-scripts/b.js"]},
            {"js": ["content-scripts/page.js"], "world": "MAIN"}
        ]}"#;
        write(&root, "out/manifest.json", manifest)?;
        write(&root, "out/popup.html", "")?;
        for file in [
            "src/entrypoints/a.content.ts",
            "src/entrypoints/b.content/index.ts",
            "src/entrypoints/page.content.ts",
            "src/entrypoints/background.ts",
        ] {
            write(&root, file, "")?;
        }
        write(
            &root,
            "src/entrypoints/popup/index.html",
            r#"<script src="./main.ts" type="module"></script>"#,
        )?;
        let found = discover(&root, &root.join("out"));
        fs::remove_dir_all(&root)?;
        let summary: Vec<(String, EntryKind, String)> = found?
            .into_iter()
            .map(|entry| (entry.name, entry.kind, entry.source_path))
            .collect();
        let expected = [
            ("a", EntryKind::ContentScript, "a.content.ts"),
            ("b", EntryKind::ContentScript, "b.content/index.ts"),
            ("page", EntryKind::Cold, "page.content.ts"),
            ("popup", EntryKind::Page, "popup/main.ts"),
            ("background", EntryKind::Cold, "background.ts"),
        ]
        .map(|(name, kind, file)| (name.to_owned(), kind, format!("{ENTRYPOINTS_DIR}/{file}")));
        assert_eq!(summary, expected);
        Ok(())
    }
}
