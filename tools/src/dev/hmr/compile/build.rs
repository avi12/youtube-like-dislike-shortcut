//! Orchestrates one HMR build: one worker build that reads the whole extension's module graph, one
//! per hot swappable entrypoint, then the Rust post-processing.

use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

use tokio::fs;

use crate::dev::hmr::analysis::wxt_resolution::{
    entry_input, read_auto_imports, read_path_aliases, virtual_modules, PathAlias, VirtualModules,
};
use crate::dev::hmr::chunks::{GraphCollector, ModuleRecord};
use crate::dev::hmr::compile::output::{finish_build, BuiltEntry, ContentState, FinishInput};
use crate::dev::hmr::compile::protocol::{WorkerJob, MODE_DEVELOPMENT};
use crate::dev::hmr::compile::worker::{run_worker, Transforms};
use crate::dev::hmr::config::{without_query, ProjectPaths, HMR_OUT_SUBDIR, HMR_RUNTIME_GLOBAL};
use crate::dev::hmr::entries::{discover, EntryKind, Entrypoint};
use crate::dev::hmr::error::Result;
use crate::output::options::{DevBrowser, MANIFEST_VERSION};
use dev_hot::types::RelPath;

const SVELTE_EXTENSION: &str = ".svelte";

/// What one HMR build needs to know.
#[derive(Debug, Clone)]
pub(crate) struct HmrRequest {
    /// The project (the repository root).
    pub(crate) project_root: PathBuf,
    /// The extension build output the HMR modules are added under.
    pub(crate) output_directory: PathBuf,
    /// The browser the build targets.
    pub(crate) browser: DevBrowser,
    /// The in-page runtime, written as `runtime.js`.
    pub(crate) runtime_source: String,
}

/// What one HMR build reports.
#[derive(Debug, Clone)]
pub(crate) struct HmrBuild {
    /// Every source file an edit can hot swap.
    pub(crate) source_modules: Vec<RelPath>,
    /// Lines worth logging about modules that can't hot swap.
    pub(crate) logs: Vec<String>,
    /// The entrypoints that run from the HMR modules.
    pub(crate) hot_entries: Vec<Entrypoint>,
    /// What each hot content script was built from, which the running pages cannot swap.
    pub(crate) content_scripts: BTreeMap<String, ContentState>,
}

/// What every worker build of one HMR build shares.
struct SharedJobParts {
    paths: ProjectPaths,
    aliases: Vec<PathAlias>,
    output_directory: String,
    browser: DevBrowser,
    transforms: Transforms,
}

impl SharedJobParts {
    async fn build(
        &self,
        project_root: &Path,
        entry: &str,
        input: &BTreeMap<String, String>,
        modules: &VirtualModules,
    ) -> Result<crate::dev::hmr::chunks::BuildOutput> {
        let job = WorkerJob {
            project_root: self.paths.root(),
            source_prefix: self.paths.source_prefix(),
            runtime_global: HMR_RUNTIME_GLOBAL,
            mode: MODE_DEVELOPMENT,
            browser: self.browser,
            manifest_version: MANIFEST_VERSION,
            entry,
            output_directory: &self.output_directory,
            input,
            cache_epoch: self.transforms.cache_epoch(),
            aliases: &self.aliases,
            virtual_modules: modules,
        };
        run_worker(project_root, &job, &self.transforms).await
    }
}

fn normalized(module_id: &str) -> String {
    without_query(module_id).replace('\\', "/")
}

/// The source ids of every module reachable from `root` through the graph's imports.
fn reachable_sources(
    paths: &ProjectPaths,
    modules: &[ModuleRecord],
    root: &str,
) -> BTreeSet<String> {
    let mut imports: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for module in modules {
        for importer in &module.importers {
            imports
                .entry(normalized(importer))
                .or_default()
                .push(normalized(&module.id));
        }
    }
    let mut visited = BTreeSet::new();
    let mut pending = vec![normalized(root)];
    while let Some(current) = pending.pop() {
        if !visited.insert(current.clone()) {
            continue;
        }
        pending.extend(imports.get(&current).cloned().unwrap_or_default());
    }
    visited
        .iter()
        .filter_map(|module| paths.source_id_of(module))
        .collect()
}

/// The entrypoints split into the ones that hot swap (they mount components outside the page's
/// world) and the source files of all the others.
fn split_entries(
    paths: &ProjectPaths,
    entries: Vec<Entrypoint>,
    modules: &[ModuleRecord],
) -> (Vec<Entrypoint>, BTreeSet<String>) {
    let mut hot = Vec::new();
    let mut cold_modules = BTreeSet::new();
    for entry in entries {
        let sources = reachable_sources(paths, modules, &paths.absolute(&entry.source_path));
        let is_mounting_components = sources
            .iter()
            .any(|source| source.ends_with(SVELTE_EXTENSION));
        let is_hot = entry.kind != EntryKind::Cold && is_mounting_components;
        if is_hot {
            hot.push(entry);
            continue;
        }
        cold_modules.extend(sources);
    }
    (hot, cold_modules)
}

/// Builds the HMR modules and the manifest the in-page runtime polls under `<output>/hmr/`.
pub(crate) async fn build_hmr(request: &HmrRequest) -> Result<HmrBuild> {
    let paths = ProjectPaths::new(&request.project_root);
    let output_directory = request.output_directory.join(HMR_OUT_SUBDIR);
    fs::create_dir_all(&output_directory).await?;
    let entries = discover(&request.project_root, &request.output_directory)?;
    let shared = SharedJobParts {
        aliases: read_path_aliases(&paths)?,
        output_directory: output_directory.to_string_lossy().replace('\\', "/"),
        browser: request.browser,
        transforms: Transforms::new(read_auto_imports(&paths)?)?,
        paths,
    };
    let graph_input: BTreeMap<String, String> = entries
        .iter()
        .map(|entry| {
            (
                entry.name.clone(),
                shared.paths.absolute(&entry.source_path),
            )
        })
        .collect();
    let graph = shared
        .build(
            &request.project_root,
            "",
            &graph_input,
            &virtual_modules(&shared.paths, None),
        )
        .await?;
    let (hot, cold_modules) = split_entries(&shared.paths, entries, &graph.modules);
    let mut built = Vec::new();
    for entry in &hot {
        let input = BTreeMap::from([(entry.name.clone(), entry_input(&shared.paths, entry))]);
        let output = shared
            .build(
                &request.project_root,
                &entry.name,
                &input,
                &virtual_modules(&shared.paths, Some(entry)),
            )
            .await?;
        built.push(BuiltEntry {
            graph: GraphCollector::from_modules(&shared.paths, &output.modules),
            chunks: output.chunks,
            entry: entry.clone(),
        });
    }
    let finish = FinishInput {
        paths: shared.paths,
        output_directory,
        runtime_source: request.runtime_source.clone(),
        built,
        cold_modules,
    };
    let finished = tokio::task::spawn_blocking(move || finish_build(finish)).await??;
    Ok(HmrBuild {
        source_modules: finished.swappable_files.iter().map(RelPath::new).collect(),
        logs: finished.logs,
        hot_entries: hot,
        content_scripts: finished.content_scripts,
    })
}

#[cfg(test)]
mod tests {
    use crate::dev::hmr::compile::build::*;

    fn record(id: &str, importers: &[&str]) -> ModuleRecord {
        ModuleRecord {
            id: id.to_owned(),
            importers: importers.iter().map(|name| (*name).to_owned()).collect(),
        }
    }

    fn entry(name: &str, kind: EntryKind) -> Entrypoint {
        Entrypoint {
            name: name.to_owned(),
            kind,
            source_path: format!("src/{name}.ts"),
            built_file: format!("{name}.js"),
        }
    }

    #[test]
    fn only_isolated_entries_mounting_components_hot_swap() {
        let paths = ProjectPaths::new(Path::new("/repo"));
        let modules = [
            record(
                "/repo/src/App.svelte",
                &["/repo/src/page.ts", "/repo/src/main.ts"],
            ),
            record(
                "/repo/src/lib.ts",
                &["/repo/src/App.svelte", "/repo/src/plain.ts"],
            ),
        ];
        let entries = vec![
            entry("page", EntryKind::Page),
            entry("main", EntryKind::Cold),
            entry("plain", EntryKind::ContentScript),
        ];
        let (hot, cold) = split_entries(&paths, entries, &modules);
        assert_eq!(hot, [entry("page", EntryKind::Page)]);
        assert!(cold.contains("src/lib.ts"));
        assert!(cold.contains("src/plain.ts"));
    }
}
