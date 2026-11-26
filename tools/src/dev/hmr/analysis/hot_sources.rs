//! Works out, from the HMR builds' module graphs, which source files an edit can hot swap:
//!  - `.svelte` files: the component swaps itself through its HMR proxy
//!  - `.ts` / `.svelte.ts` modules: re-imported, which re-mounts the nearest `.svelte` components
//!    importing them (their version changes with it). Allowed only when the module and every module
//!    between it and those components is free of top-level side effects and none of them is an
//!    entrypoint - the way Vite's accept boundaries work: an update that reaches a module nobody
//!    accepts means a reload
//!  - global `.css` files reached only by pages: the runtime swaps the stylesheet in place
//!
//! A module an entrypoint without HMR also bundles never swaps: that copy would stay stale.

use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use super::reasons::ReloadReasoner;
use crate::dev::hmr::chunks::{ChunkType, GraphCollector, OutputChunk};
use crate::dev::hmr::config::ProjectPaths;
use crate::dev::hmr::entries::EntryKind;
use crate::dev::hmr::error::Result;

const COLD_REASON: &str = "an entrypoint without HMR also runs it";
const CONTENT_STYLE_REASON: &str = "a content script loads it as a static stylesheet";
const ASSETS_DIR: &str = "assets";

/// One hot swappable entrypoint's bundle and graph.
pub(crate) struct EntryBuild<'build> {
    pub(crate) name: &'build str,
    pub(crate) kind: EntryKind,
    pub(crate) chunks: &'build [OutputChunk],
    pub(crate) graph: &'build GraphCollector,
}

/// What an edit can swap, and what it cannot.
#[derive(Debug, Default)]
pub(crate) struct HotSources {
    pub(crate) swappable_files: BTreeSet<String>,
    pub(crate) reload_reasons: BTreeMap<String, String>,
    /// Page entry name to its global stylesheets, as paths relative to the HMR output folder.
    pub(crate) page_styles: BTreeMap<String, Vec<String>>,
}

impl HotSources {
    fn reject(&mut self, source_id: &str, reason: &str) {
        self.swappable_files.remove(source_id);
        self.reload_reasons
            .entry(source_id.to_owned())
            .or_insert_with(|| reason.to_owned());
    }

    fn accept(&mut self, source_id: &str) {
        if !self.reload_reasons.contains_key(source_id) {
            self.swappable_files.insert(source_id.to_owned());
        }
    }
}

fn is_script_module(path: &str) -> bool {
    Path::new(path)
        .extension()
        .is_some_and(|extension| extension == "ts" || extension == "js")
}

fn describe_scripts(
    paths: &ProjectPaths,
    entry: &EntryBuild<'_>,
    found: &mut HotSources,
) -> Result<()> {
    let mut reasoner = ReloadReasoner::new(paths, entry.chunks);
    let infos: Vec<_> = reasoner.infos().cloned().collect();
    for info in infos {
        let Some(source_id) = &info.source_id else {
            continue;
        };
        if info.is_svelte {
            found.accept(source_id);
            continue;
        }
        let is_script = info.entry_name.is_none()
            && info.absolute_path.as_deref().is_some_and(is_script_module);
        if !is_script {
            continue;
        }
        match reasoner.reason_of(&info.file_name)? {
            Some(reason) => found.reject(source_id, &reason),
            None => found.accept(source_id),
        }
    }
    Ok(())
}

fn describe_styles(entry: &EntryBuild<'_>, found: &mut HotSources) {
    let assets: BTreeSet<&str> = entry
        .chunks
        .iter()
        .filter(|chunk| chunk.kind == ChunkType::Asset)
        .map(|chunk| chunk.file_name.as_str())
        .collect();
    let mut styles = Vec::new();
    for css_id in entry.graph.css_importers.keys() {
        if entry.graph.queried_css.contains(css_id) {
            continue;
        }
        if entry.kind != EntryKind::Page {
            found.reject(css_id, CONTENT_STYLE_REASON);
            continue;
        }
        let asset = format!("{}/{ASSETS_DIR}/{css_id}", entry.name);
        if assets.contains(asset.as_str()) {
            found.accept(css_id);
            styles.push(asset);
        }
    }
    if entry.kind == EntryKind::Page {
        found.page_styles.insert(entry.name.to_owned(), styles);
    }
}

/// Splits the source files of the hot swappable entrypoints into swappable ones and ones whose edit
/// needs a reload. `cold_modules` are the source files the other entrypoints bundle.
pub(crate) fn describe_hot_sources(
    paths: &ProjectPaths,
    entries: &[EntryBuild<'_>],
    cold_modules: &BTreeSet<String>,
) -> Result<HotSources> {
    let mut found = HotSources::default();
    for module in cold_modules {
        found.reject(module, COLD_REASON);
    }
    for entry in entries {
        describe_scripts(paths, entry, &mut found)?;
        describe_styles(entry, &mut found);
    }
    found.reload_reasons.retain(|source_id, _| {
        entries
            .iter()
            .any(|entry| entry.graph.files.contains(source_id))
    });
    Ok(found)
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;
    use crate::dev::hmr::chunks::ModuleRecord;

    #[test]
    fn a_stylesheet_swaps_only_when_pages_alone_load_it() -> Result<()> {
        let paths = ProjectPaths::new(Path::new("/repo"));
        let graph = GraphCollector::from_modules(
            &paths,
            &[ModuleRecord {
                id: "/repo/src/a.css".to_owned(),
                importers: Vec::new(),
            }],
        );
        let asset: OutputChunk = serde_json::from_value(serde_json::json!({
            "type": "asset", "fileName": "popup/assets/src/a.css"
        }))?;
        let page = EntryBuild {
            name: "popup",
            kind: EntryKind::Page,
            chunks: std::slice::from_ref(&asset),
            graph: &graph,
        };
        let alone = describe_hot_sources(&paths, &[page], &BTreeSet::new())?;
        assert!(alone.swappable_files.contains("src/a.css"));
        let page = EntryBuild {
            name: "popup",
            kind: EntryKind::Page,
            chunks: &[asset],
            graph: &graph,
        };
        let shared = BTreeSet::from(["src/a.css".to_owned()]);
        let found = describe_hot_sources(&paths, &[page], &shared)?;
        assert!(found.swappable_files.is_empty());
        assert_eq!(
            found.reload_reasons.get("src/a.css").map(String::as_str),
            Some(COLD_REASON)
        );
        Ok(())
    }
}
