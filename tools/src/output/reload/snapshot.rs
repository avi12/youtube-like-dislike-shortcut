//! A build output directory as content hashes plus its manifest.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use dev_hot::types::ContentHash;

use crate::output::error::{OutputError, Result};
use crate::output::manifest::{ExtensionManifest, MANIFEST_FILE};

/// Chrome writes its indexed DNR rulesets into the unpacked extension's own dir.
const BROWSER_METADATA_DIR_PREFIX: &str = "_metadata/";

/// Every output file's content hash, and the manifest it ships.
#[derive(Debug, Clone, Default, PartialEq)]
pub(crate) struct BuildSnapshot {
    pub(crate) file_hashes: BTreeMap<String, String>,
    pub(crate) manifest: ExtensionManifest,
}

fn list_directory(directory: &Path) -> Result<Vec<fs::DirEntry>> {
    let entries = fs::read_dir(directory).map_err(OutputError::with_path(directory))?;
    entries
        .map(|entry| entry.map_err(OutputError::with_path(directory)))
        .collect()
}

fn list_output_files(output_dir: &Path, skipped_prefix: &str) -> Result<Vec<String>> {
    let mut files = Vec::new();
    if !output_dir.exists() {
        return Ok(files);
    }
    let mut pending = vec![output_dir.to_path_buf()];
    while let Some(directory) = pending.pop() {
        for entry in list_directory(&directory)? {
            let path = entry.path();
            let kind = entry.file_type().map_err(OutputError::with_path(&path))?;
            if kind.is_dir() {
                pending.push(path);
                continue;
            }
            let Ok(relative) = path.strip_prefix(output_dir) else {
                continue;
            };
            files.push(relative.to_string_lossy().replace('\\', "/"));
        }
    }
    files.retain(|file| {
        !file.starts_with(BROWSER_METADATA_DIR_PREFIX) && !file.starts_with(skipped_prefix)
    });
    files.sort();
    Ok(files)
}

/// Hashes every output file, minus browser metadata and the files under `skipped_prefix` (the HMR
/// modules, which the running pages pick up by themselves), and reads the manifest.
pub(crate) fn take_build_snapshot(
    output_dir: &Path,
    skipped_prefix: &str,
) -> Result<BuildSnapshot> {
    let files = list_output_files(output_dir, skipped_prefix)?;
    let has_manifest = files.iter().any(|file| file == MANIFEST_FILE);
    let mut file_hashes = BTreeMap::new();
    for file in files {
        let path = output_dir.join(&file);
        let bytes = fs::read(&path).map_err(OutputError::with_path(&path))?;
        file_hashes.insert(file, ContentHash::from_bytes(&bytes).as_str().to_owned());
    }
    let manifest = if has_manifest {
        ExtensionManifest::read(output_dir)?
    } else {
        ExtensionManifest::default()
    };
    Ok(BuildSnapshot {
        file_hashes,
        manifest,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metadata_and_skipped_files_are_left_out() -> Result<()> {
        let directory =
            std::env::temp_dir().join(format!("devtool-snapshot-{}", std::process::id()));
        for file in ["_metadata/rules", "hmr/a.js", "background.js"] {
            let path = directory.join(file);
            let parent = path.parent().unwrap_or(&directory);
            fs::create_dir_all(parent).map_err(OutputError::with_path(parent))?;
            fs::write(&path, "x").map_err(OutputError::with_path(&path))?;
        }
        let snapshot = take_build_snapshot(&directory, "hmr/")?;
        fs::remove_dir_all(&directory).map_err(OutputError::with_path(&directory))?;
        let files: Vec<&str> = snapshot.file_hashes.keys().map(String::as_str).collect();
        assert_eq!(files, ["background.js"]);
        Ok(())
    }

    #[test]
    fn a_missing_directory_is_an_empty_snapshot() -> Result<()> {
        let snapshot = take_build_snapshot(Path::new("devtool-no-such-directory"), "hmr/")?;
        assert_eq!(snapshot, BuildSnapshot::default());
        Ok(())
    }
}
