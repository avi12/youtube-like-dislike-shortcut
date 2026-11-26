//! What the dev-only HMR build and its loaders share: where the output lives and the manifest the
//! in-page runtime polls.

use std::collections::BTreeMap;
use std::path::Path;

use dev_hot::types::ContentHash;
use serde::Serialize;

/// The folder of the HMR modules inside the build output.
pub(crate) const HMR_OUT_SUBDIR: &str = "hmr";
pub(crate) const HMR_MANIFEST_FILE: &str = "manifest.json";
/// Where the runtime fetches the manifest, relative to the extension root.
pub(crate) const HMR_MANIFEST_PATH: &str = "hmr/manifest.json";
pub(crate) const HMR_RUNTIME_FILE: &str = "runtime.js";
/// The loader of one page entry, inside that entry's folder.
pub(crate) const HMR_PAGE_LOADER_FILE: &str = "dev-loader.js";
pub(crate) const HMR_RUNTIME_GLOBAL: &str = "devHmr";

const SOURCE_ID_PREFIX: &str = "src/";
const SHORT_HASH_HEX_CHARS: usize = 12;

/// What the runtime and the dev server read about one hot swappable entrypoint.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManifestEntry {
    /// The entry module, relative to the extension root.
    pub(crate) url: String,
    /// A change of it means the dependency graph was re-split.
    pub(crate) vendor_hash: String,
    /// The global stylesheets of a page entry.
    pub(crate) styles: Vec<String>,
    pub(crate) styles_hash: String,
}

/// The manifest the in-page runtime polls.
#[derive(Debug, Clone, Default, Serialize)]
pub(crate) struct HmrManifest {
    /// Entry name to what it is made of.
    pub(crate) entries: BTreeMap<String, ManifestEntry>,
    /// Component module URL, relative to the extension root, to its version.
    pub(crate) modules: BTreeMap<String, String>,
}

/// The first twelve hex digits of the SHA-256 of `content`: the cache-busting version of a module.
pub(crate) fn short_hash(content: &[u8]) -> String {
    ContentHash::from_bytes(content)
        .prefix(SHORT_HASH_HEX_CHARS)
        .to_owned()
}

/// Where the project and its `src/` live, in the forward-slash spelling Vite module ids use.
#[derive(Debug, Clone)]
pub(crate) struct ProjectPaths {
    root: String,
    src_prefix: String,
}

impl ProjectPaths {
    pub(crate) fn new(root: &Path) -> Self {
        let spelled = root.to_string_lossy().replace('\\', "/");
        let root = spelled.trim_end_matches('/').to_owned();
        let src_prefix = format!("{root}/src/");
        Self { root, src_prefix }
    }

    pub(crate) fn root(&self) -> &str {
        &self.root
    }

    pub(crate) fn src_prefix(&self) -> &str {
        &self.src_prefix
    }

    /// The absolute, forward-slash path of a project-relative one.
    pub(crate) fn absolute(&self, relative: &str) -> String {
        format!("{}/{relative}", self.root)
    }

    /// Whether a module path (query allowed) is a file under `src/`.
    pub(crate) fn is_source(&self, module_path: &str) -> bool {
        without_query(module_path)
            .replace('\\', "/")
            .starts_with(&self.src_prefix)
    }

    /// The project-relative `src/...` id of a module path, or `None` for anything outside `src/`.
    pub(crate) fn src_id_of(&self, module_path: &str) -> Option<String> {
        let spelled = without_query(module_path).replace('\\', "/");
        let rest = spelled.strip_prefix(&self.src_prefix)?;
        Some(format!("{SOURCE_ID_PREFIX}{rest}"))
    }
}

/// A module path without its `?query`.
pub(crate) fn without_query(module_path: &str) -> &str {
    module_path
        .split_once('?')
        .map_or(module_path, |(path, _)| path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn source_ids_are_project_relative() {
        let paths = ProjectPaths::new(Path::new(r"C:\repo"));
        assert_eq!(
            paths.src_id_of(r"C:\repo\src\a\b.svelte?x=1").as_deref(),
            Some("src/a/b.svelte")
        );
        assert_eq!(paths.src_id_of("C:/repo/node_modules/x.js"), None);
    }

    #[test]
    fn short_hash_is_twelve_hex_digits() {
        assert_eq!(short_hash(b"abc"), "ba7816bf8f01");
    }

    #[test]
    fn the_manifest_path_is_inside_the_output_folder() {
        assert_eq!(
            HMR_MANIFEST_PATH,
            format!("{HMR_OUT_SUBDIR}/{HMR_MANIFEST_FILE}")
        );
    }
}
