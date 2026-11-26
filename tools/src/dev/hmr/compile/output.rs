//! Turns what the bundler wrote into the HMR output: version-stamped modules, the manifest, the
//! runtime and the page loaders, and the report of which edits cannot hot swap.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, PoisonError};

use base64::Engine;

use super::versions::{
    compute_final_versions, describe_chunks, hash_vendor_chunks, HmrChunk, ImportStamper,
    ServedVersions,
};
use crate::dev::hmr::analysis::hot_sources::{describe_hot_sources, EntryBuild, HotSources};
use crate::dev::hmr::chunks::{ChunkType, GraphCollector, OutputChunk};
use crate::dev::hmr::config::{
    short_hash, HmrManifest, ManifestEntry, ProjectPaths, HMR_MANIFEST_FILE, HMR_OUT_SUBDIR,
    HMR_PAGE_LOADER_FILE, HMR_RUNTIME_FILE,
};
use crate::dev::hmr::entries::{EntryKind, Entrypoint};
use crate::dev::hmr::error::{HmrError, Result};
use crate::dev::payload::page_loader_source;

const SVELTE_EXTENSION: &str = ".svelte";
const STYLE_OPEN: &str = "<style";
const STYLE_CLOSE: &str = "</style>";

/// The source hash of each module whose edit can't hot swap, as of the previous build of this
/// process.
static PREVIOUS_SOURCE_HASHES: Mutex<BTreeMap<String, String>> = Mutex::new(BTreeMap::new());

/// The URL version each module was served under, across the builds of this process.
static SERVED_VERSIONS: Mutex<ServedVersions> = Mutex::new(ServedVersions::new());

/// A hash of what was last written to each output file, so an edit rewrites only what changed.
static WRITTEN_HASHES: Mutex<BTreeMap<String, String>> = Mutex::new(BTreeMap::new());
/// The set of files the previous build produced, so the stale sweep runs only when it changes.
static PREVIOUS_FILES: Mutex<BTreeSet<String>> = Mutex::new(BTreeSet::new());

/// One entrypoint as the bundler built it.
pub(super) struct BuiltEntry {
    pub(super) entry: Entrypoint,
    pub(super) chunks: Vec<OutputChunk>,
    pub(super) graph: GraphCollector,
}

/// What a running content script was built from outside its components, which only a reload
/// replaces.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ContentState {
    /// The version of the entry module: everything reached without passing through a component.
    pub(crate) version: String,
    pub(crate) vendor_hash: String,
    /// The components' `<style>` blocks, which the running UI also holds as a static stylesheet.
    pub(crate) styles_hash: String,
}

/// Everything the post-processing of one build needs.
pub(super) struct FinishInput {
    pub(super) paths: ProjectPaths,
    pub(super) output_directory: PathBuf,
    pub(super) runtime_source: String,
    pub(super) built: Vec<BuiltEntry>,
    pub(super) cold_modules: BTreeSet<String>,
}

/// What a finished build reports.
pub(super) struct Finished {
    pub(super) swappable_files: BTreeSet<String>,
    pub(super) logs: Vec<String>,
    pub(super) content_scripts: BTreeMap<String, ContentState>,
}

fn chunk_codes(chunks: &[OutputChunk]) -> BTreeMap<String, String> {
    chunks
        .iter()
        .filter(|chunk| chunk.kind == ChunkType::Chunk)
        .map(|chunk| {
            (
                chunk.file_name.clone(),
                chunk.code.clone().unwrap_or_default(),
            )
        })
        .collect()
}

/// Writes `bytes` unless the previous build already wrote the same content there.
fn write_if_changed(output_directory: &Path, file_name: &str, bytes: &[u8]) -> Result<()> {
    let hash = short_hash(bytes);
    let mut written = WRITTEN_HASHES
        .lock()
        .unwrap_or_else(PoisonError::into_inner);
    if written.get(file_name) == Some(&hash) {
        return Ok(());
    }
    let path = output_directory.join(file_name);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, bytes)?;
    written.insert(file_name.to_owned(), hash);
    Ok(())
}

fn write_assets(output_directory: &Path, chunks: &[OutputChunk]) -> Result<()> {
    for chunk in chunks.iter().filter(|chunk| chunk.kind == ChunkType::Asset) {
        let source = chunk.source.as_deref().unwrap_or_default();
        if chunk.is_source_base64 {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(source)
                .map_err(|error| HmrError::Worker(error.to_string()))?;
            write_if_changed(output_directory, &chunk.file_name, &bytes)?;
            continue;
        }
        write_if_changed(output_directory, &chunk.file_name, source.as_bytes())?;
    }
    Ok(())
}

/// A build that emptied the output directory (the WXT build does) invalidates what was written.
fn forget_writes_when_directory_was_emptied(output_directory: &Path) {
    if output_directory.join(HMR_MANIFEST_FILE).exists() {
        return;
    }
    WRITTEN_HASHES
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .clear();
    PREVIOUS_FILES
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .clear();
}

/// The text of every `<style>` block of a component's source.
fn style_blocks(source: &str) -> String {
    source
        .split(STYLE_OPEN)
        .skip(1)
        .filter_map(|rest| rest.split_once(STYLE_CLOSE))
        .map(|(block, _)| block)
        .collect()
}

fn hash_component_styles(paths: &ProjectPaths, graph: &GraphCollector) -> Result<String> {
    let mut styles = String::new();
    for source_id in graph
        .files
        .iter()
        .filter(|file| file.ends_with(SVELTE_EXTENSION))
    {
        let path = PathBuf::from(paths.absolute(source_id));
        let source = fs::read_to_string(&path).map_err(|source| HmrError::Read { path, source })?;
        styles.push_str(&style_blocks(&source));
    }
    Ok(short_hash(styles.as_bytes()))
}

fn component_modules(
    paths: &ProjectPaths,
    chunks: &[OutputChunk],
    versions: &BTreeMap<String, String>,
) -> BTreeMap<String, String> {
    chunks
        .iter()
        .filter(|chunk| {
            chunk
                .facade_module_id
                .as_deref()
                .is_some_and(|id| id.ends_with(SVELTE_EXTENSION) && paths.is_source(id))
        })
        .filter_map(|chunk| {
            let version = versions.get(&chunk.file_name)?;
            Some((
                format!("{HMR_OUT_SUBDIR}/{}", chunk.file_name),
                version.clone(),
            ))
        })
        .collect()
}

/// The entry module's file name, relative to the HMR output folder.
fn entry_file(built: &BuiltEntry) -> Result<&str> {
    built
        .chunks
        .iter()
        .find(|chunk| chunk.is_entry && chunk.name.as_deref() == Some(&built.entry.name))
        .map(|chunk| chunk.file_name.as_str())
        .ok_or_else(|| HmrError::Worker(format!("no entry module for {}", built.entry.name)))
}

/// What describes the entries once every module has its served version.
struct Described {
    manifest: HmrManifest,
    content_scripts: BTreeMap<String, ContentState>,
    /// Page loader files, relative to the HMR output folder, and their sources.
    page_loaders: BTreeMap<String, String>,
}

fn describe_entries(
    paths: &ProjectPaths,
    built: &[BuiltEntry],
    by_file_name: &BTreeMap<String, HmrChunk>,
    versions: &BTreeMap<String, String>,
    hot_sources: &HotSources,
) -> Result<Described> {
    let mut described = Described {
        manifest: HmrManifest::default(),
        content_scripts: BTreeMap::new(),
        page_loaders: BTreeMap::new(),
    };
    for item in built {
        let name = &item.entry.name;
        let file = entry_file(item)?;
        let vendor_hash = hash_vendor_chunks(by_file_name, &format!("{name}/"));
        let styles = hot_sources
            .page_styles
            .get(name)
            .cloned()
            .unwrap_or_default();
        let mut style_bytes = Vec::new();
        for style in &styles {
            let asset = item.chunks.iter().find(|chunk| chunk.file_name == *style);
            let source = asset.and_then(|chunk| chunk.source.as_deref());
            style_bytes.extend_from_slice(source.unwrap_or_default().as_bytes());
        }
        described
            .manifest
            .modules
            .extend(component_modules(paths, &item.chunks, versions));
        if item.entry.kind == EntryKind::Page {
            let loader = format!("{name}/{HMR_PAGE_LOADER_FILE}");
            let url = format!("{HMR_OUT_SUBDIR}/{file}");
            described
                .page_loaders
                .insert(loader, page_loader_source(name, &url));
        } else {
            described.content_scripts.insert(
                name.clone(),
                ContentState {
                    version: versions.get(file).cloned().unwrap_or_default(),
                    vendor_hash: vendor_hash.clone(),
                    styles_hash: hash_component_styles(paths, &item.graph)?,
                },
            );
        }
        described.manifest.entries.insert(
            name.clone(),
            ManifestEntry {
                url: format!("{HMR_OUT_SUBDIR}/{file}"),
                vendor_hash,
                styles: styles
                    .iter()
                    .map(|style| format!("{HMR_OUT_SUBDIR}/{style}"))
                    .collect(),
                styles_hash: short_hash(&style_bytes),
            },
        );
    }
    Ok(described)
}

fn collect_files(directory: &Path, found: &mut Vec<PathBuf>) {
    let Ok(listing) = fs::read_dir(directory) else {
        return;
    };
    for entry in listing.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_files(&path, found);
        } else {
            found.push(path);
        }
    }
}

/// Outputs are written over the previous build (the browser holds served files open, so emptying
/// the directory intermittently fails on Windows); leftovers of renamed sources are swept
/// afterwards, best effort.
fn sweep_stale_outputs(output_directory: &Path, expected_files: &BTreeSet<String>) {
    let mut files = Vec::new();
    collect_files(output_directory, &mut files);
    for file in files {
        let Ok(relative) = file.strip_prefix(output_directory) else {
            continue;
        };
        let spelled = relative.to_string_lossy().replace('\\', "/");
        if expected_files.contains(&spelled) {
            continue;
        }
        if let Err(error) = fs::remove_file(&file) {
            tracing::debug!("could not remove a stale output {spelled}: {error}");
        }
    }
}

/// Which modules that can't hot swap changed since the last build, and why - the one place the
/// side-effect rules are reported.
fn describe_reload_logs(
    paths: &ProjectPaths,
    reload_reasons: &BTreeMap<String, String>,
) -> Result<Vec<String>> {
    let mut previous = PREVIOUS_SOURCE_HASHES
        .lock()
        .unwrap_or_else(PoisonError::into_inner);
    let is_first_build = previous.is_empty();
    let mut logs = Vec::new();
    for (source_id, reason) in reload_reasons {
        let path = PathBuf::from(paths.absolute(source_id));
        let bytes = fs::read(&path).map_err(|source| HmrError::Read { path, source })?;
        let hash = short_hash(&bytes);
        let is_edited_since_last_build = !is_first_build && previous.get(source_id) != Some(&hash);
        if is_edited_since_last_build {
            logs.push(format!("HMR: {source_id} can't hot swap - {reason}"));
        }
        previous.insert(source_id.clone(), hash);
    }
    if is_first_build {
        logs.push(format!(
            "HMR: {} modules of the hot entrypoints can't hot swap when edited",
            reload_reasons.len()
        ));
    }
    Ok(logs)
}

fn write_stamped_modules(
    output_directory: &Path,
    by_file_name: &BTreeMap<String, HmrChunk>,
    versions: &BTreeMap<String, String>,
) -> Result<()> {
    let stamper = ImportStamper::new()?;
    for file_name in by_file_name.keys() {
        let rewritten = stamper.stamp(file_name, by_file_name, versions);
        write_if_changed(output_directory, file_name, rewritten.as_bytes())?;
    }
    Ok(())
}

/// Stamps and writes the modules, analyses what can swap, writes the runtime, loaders and manifest.
pub(super) fn finish_build(input: FinishInput) -> Result<Finished> {
    let FinishInput {
        paths,
        output_directory,
        runtime_source,
        built,
        cold_modules,
    } = input;
    fs::create_dir_all(&output_directory)?;
    forget_writes_when_directory_was_emptied(&output_directory);
    let chunks: Vec<OutputChunk> = built.iter().flat_map(|item| item.chunks.clone()).collect();
    write_assets(&output_directory, &chunks)?;
    let codes = chunk_codes(&chunks);
    let by_file_name = describe_chunks(&paths, &chunks, &codes);
    let versions = SERVED_VERSIONS
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .refresh(compute_final_versions(&by_file_name));
    write_stamped_modules(&output_directory, &by_file_name, &versions)?;
    let entry_builds: Vec<EntryBuild<'_>> = built
        .iter()
        .map(|item| EntryBuild {
            name: &item.entry.name,
            kind: item.entry.kind,
            chunks: &item.chunks,
            graph: &item.graph,
        })
        .collect();
    let hot_sources = describe_hot_sources(&paths, &entry_builds, &cold_modules)?;
    let described = describe_entries(&paths, &built, &by_file_name, &versions, &hot_sources)?;
    write_if_changed(
        &output_directory,
        HMR_RUNTIME_FILE,
        runtime_source.as_bytes(),
    )?;
    for (file_name, source) in &described.page_loaders {
        write_if_changed(&output_directory, file_name, source.as_bytes())?;
    }
    let expected_files: BTreeSet<String> = chunks
        .iter()
        .map(|chunk| chunk.file_name.clone())
        .chain(described.page_loaders.keys().cloned())
        .chain([HMR_MANIFEST_FILE.to_owned(), HMR_RUNTIME_FILE.to_owned()])
        .collect();
    let is_file_set_changed = {
        let mut previous = PREVIOUS_FILES
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        let is_changed = *previous != expected_files;
        previous.clone_from(&expected_files);
        is_changed
    };
    if is_file_set_changed {
        sweep_stale_outputs(&output_directory, &expected_files);
    }
    write_if_changed(
        &output_directory,
        HMR_MANIFEST_FILE,
        serde_json::to_string(&described.manifest)?.as_bytes(),
    )?;
    let logs = describe_reload_logs(&paths, &hot_sources.reload_reasons)?;
    Ok(Finished {
        swappable_files: hot_sources.swappable_files,
        logs,
        content_scripts: described.content_scripts,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn style_blocks_are_what_a_style_change_is_judged_by() {
        let source = "<script></script><p>a</p><style>\n  p { color: red }\n</style>";
        assert_eq!(style_blocks(source), ">\n  p { color: red }\n");
        assert_eq!(style_blocks("<p>a</p>"), "");
    }
}
