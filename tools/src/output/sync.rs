//! Brings the directory the browser loads up to date with a staged build, file by file, so it is
//! never empty or partial while a build runs.

use std::collections::BTreeSet;
use std::fs;
use std::io::ErrorKind;
use std::path::Path;
use std::thread::sleep;
use std::time::Duration;

use crate::output::error::{OutputError, Result};
use crate::output::manifest::MANIFEST_FILE;

/// A file is written beside the staged build, then renamed over the live one, so a reader sees the
/// old content or the new, never a part.
const INCOMING_FILE: &str = "incoming";
/// The browser holds a file it is serving open for a moment, which fails the rename on Windows.
const RENAME_ATTEMPTS: u32 = 20;
const RENAME_RETRY_DELAY: Duration = Duration::from_millis(50);

fn list_files(directory: &Path) -> Result<BTreeSet<String>> {
    let mut files = BTreeSet::new();
    let mut pending = vec![directory.to_path_buf()];
    while let Some(current) = pending.pop() {
        let entries = match fs::read_dir(&current) {
            Ok(entries) => entries,
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => return Err(OutputError::with_path(&current)(error)),
        };
        for entry in entries {
            let path = entry.map_err(OutputError::with_path(&current))?.path();
            if path.is_dir() {
                pending.push(path);
                continue;
            }
            if let Ok(relative) = path.strip_prefix(directory) {
                files.insert(relative.to_string_lossy().replace('\\', "/"));
            }
        }
    }
    Ok(files)
}

fn rename_over(from: &Path, to: &Path) -> Result<()> {
    let mut attempt = 1;
    loop {
        let Err(error) = fs::rename(from, to) else {
            return Ok(());
        };
        let is_out_of_attempts = attempt >= RENAME_ATTEMPTS;
        if is_out_of_attempts {
            return Err(OutputError::with_path(to)(error));
        }
        attempt += 1;
        sleep(RENAME_RETRY_DELAY);
    }
}

fn copy_if_changed(source: &Path, destination: &Path, incoming: &Path) -> Result<()> {
    let bytes = fs::read(source).map_err(OutputError::with_path(source))?;
    let is_current = fs::read(destination).is_ok_and(|existing| existing == bytes);
    if is_current {
        return Ok(());
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(OutputError::with_path(parent))?;
    }
    fs::write(incoming, bytes).map_err(OutputError::with_path(incoming))?;
    rename_over(incoming, destination)
}

/// The order files go live in: the manifests last, since they name the other files.
fn publication_rank(file: &str) -> u8 {
    let is_manifest = file == MANIFEST_FILE;
    if is_manifest {
        return 2;
    }
    u8::from(file.ends_with(MANIFEST_FILE))
}

/// Makes `live` hold exactly the files of `staged`: writes only what changed, then removes what the
/// new build no longer has.
pub(crate) fn sync_directory(staged: &Path, live: &Path) -> Result<()> {
    let staged_files = list_files(staged)?;
    let incoming = staged.with_file_name(INCOMING_FILE);
    let mut ordered: Vec<&String> = staged_files.iter().collect();
    ordered.sort_by_key(|file| publication_rank(file));
    for file in ordered {
        copy_if_changed(&staged.join(file), &live.join(file), &incoming)?;
    }
    for file in list_files(live)?.difference(&staged_files) {
        let path = live.join(file);
        if let Err(error) = fs::remove_file(&path) {
            tracing::debug!("could not remove the stale {file}: {error}");
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::output::error::{OutputError, Result};
    use crate::output::sync::sync_directory;
    use std::fs;
    use std::path::Path;

    fn put(root: &Path, file: &str, content: &str) -> Result<()> {
        let path = root.join(file);
        let parent = path.parent().unwrap_or(root);
        fs::create_dir_all(parent).map_err(OutputError::with_path(parent))?;
        fs::write(&path, content).map_err(OutputError::with_path(&path))
    }

    #[test]
    fn the_live_directory_mirrors_the_staged_one() -> Result<()> {
        let root = std::env::temp_dir().join(format!("devtool-sync-{}", std::process::id()));
        let (staged, live) = (root.join("staged"), root.join("live"));
        put(&staged, "manifest.json", "new")?;
        put(&staged, "hmr/a.js", "a")?;
        put(&live, "manifest.json", "old")?;
        put(&live, "stale.js", "x")?;
        sync_directory(&staged, &live)?;
        let manifest = fs::read_to_string(live.join("manifest.json")).unwrap_or_default();
        let is_mirrored = live.join("hmr/a.js").is_file() && !live.join("stale.js").exists();
        fs::remove_dir_all(&root).map_err(OutputError::with_path(&root))?;
        assert_eq!(manifest, "new");
        assert!(is_mirrored);
        Ok(())
    }
}
