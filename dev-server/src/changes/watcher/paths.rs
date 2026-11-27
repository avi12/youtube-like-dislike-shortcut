//! Mapping notify's absolute event paths back to project-relative ones.

use std::path::{Component, Path};

use crate::types::RelPath;

/// Markers inside the names of the scratch files editors and tools write beside a file they save:
/// atomic writers (`App.svelte.tmp.72988.b00e`) and `JetBrains` safe write.
const TEMPORARY_NAME_MARKERS: [&str; 2] = [".tmp.", "___jb_"];
/// Endings of backup, swap and temporary files.
const TEMPORARY_NAME_SUFFIXES: [&str; 4] = ["~", ".tmp", ".swp", ".swx"];
/// Emacs lock files.
const LOCK_FILE_PREFIX: &str = ".#";
/// `sed -i` writes `sed` and six random characters.
const SED_PREFIX: &str = "sed";
const SED_RANDOM_LENGTH: usize = 6;
/// The file Vim creates to probe whether a directory is writable.
const VIM_PROBE_NAME: &str = "4913";

/// Whether a path names a scratch file, which is never a build input.
///
/// ```
/// use dev_hot::changes::watcher::is_temporary_file;
/// use dev_hot::types::RelPath;
///
/// assert!(is_temporary_file(&RelPath::new("src/App.svelte.tmp.72988.b00eec8b4635")));
/// assert!(!is_temporary_file(&RelPath::new("src/App.svelte")));
/// ```
pub fn is_temporary_file(path: &RelPath) -> bool {
    let name = path.as_str().rsplit('/').next().unwrap_or_default();
    let is_marked = TEMPORARY_NAME_MARKERS
        .iter()
        .any(|marker| name.contains(marker));
    let is_suffixed = TEMPORARY_NAME_SUFFIXES
        .iter()
        .any(|suffix| name.ends_with(suffix));
    let is_sed_output = name.strip_prefix(SED_PREFIX).is_some_and(|random| {
        let is_random_length = random.len() == SED_RANDOM_LENGTH;
        is_random_length
            && random
                .chars()
                .all(|character| character.is_ascii_alphanumeric())
    });
    let is_editor_probe = name.starts_with(LOCK_FILE_PREFIX) || name == VIM_PROBE_NAME;
    is_marked || is_suffixed || is_sed_output || is_editor_probe
}

/// Resolves `.` and `..` lexically, without touching the file system.
fn normalized_components(path: &Path) -> Vec<String> {
    let mut parts: Vec<String> = Vec::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                let is_poppable = parts.last().is_some_and(|last| last != "..");
                if is_poppable {
                    parts.pop();
                } else {
                    parts.push("..".to_owned());
                }
            }
            other => parts.push(other.as_os_str().to_string_lossy().into_owned()),
        }
    }
    parts
}

/// The project-relative path of an event path: the configured watch path itself, or a path below
/// a watched directory. `None` for paths outside every watch (the install marker lives in `..`,
/// so plain prefix stripping against the root would lose it).
///
/// ```
/// use std::path::Path;
/// use dev_hot::types::RelPath;
/// use dev_hot::changes::watcher::relativize;
///
/// let watches = [RelPath::new("src"), RelPath::new("../node_modules/.modules.yaml")];
/// let root = Path::new("/work/ext");
/// assert_eq!(
///     relativize(root, &watches, Path::new("/work/ext/src/lib/a.ts")),
///     Some(RelPath::new("src/lib/a.ts"))
/// );
/// assert_eq!(
///     relativize(root, &watches, Path::new("/work/ext/../node_modules/.modules.yaml")),
///     Some(RelPath::new("../node_modules/.modules.yaml"))
/// );
/// assert_eq!(relativize(root, &watches, Path::new("/elsewhere/a.ts")), None);
/// ```
pub fn relativize(root: &Path, watches: &[RelPath], event_path: &Path) -> Option<RelPath> {
    let event_parts = normalized_components(event_path);
    for watch in watches {
        let watch_parts = normalized_components(&root.join(watch.as_str()));
        let is_watched_path_itself = event_parts == watch_parts;
        if is_watched_path_itself {
            return Some(watch.clone());
        }
        let Some(rest) = event_parts
            .strip_prefix(watch_parts.as_slice())
            .filter(|rest| !rest.is_empty())
        else {
            continue;
        };
        let base = watch.as_str().trim_end_matches('/');
        return Some(RelPath::new(format!("{base}/{}", rest.join("/"))));
    }
    None
}

#[cfg(test)]
mod tests {
    use crate::changes::watcher::paths::*;

    #[test]
    fn scratch_files_are_told_from_sources() {
        let temporary = [
            "src/a.svelte.tmp.1.f0",
            "src/a.ts~",
            "src/a.ts___jb_tmp___",
            "src/.a.ts.swp",
            "src/sedAb12Cd",
            "src/.#a.ts",
            "src/4913",
        ];
        for path in temporary {
            assert!(is_temporary_file(&RelPath::new(path)), "{path}");
        }
        for path in [
            "src/a.ts",
            "src/seduction.ts",
            "src/template.svelte",
            "bun.lock",
        ] {
            assert!(!is_temporary_file(&RelPath::new(path)), "{path}");
        }
    }

    #[test]
    fn relativize_handles_directories_and_files() {
        let watches = [RelPath::new("src"), RelPath::new("wxt.config.ts")];
        let root = Path::new("/p");
        assert_eq!(
            relativize(root, &watches, Path::new("/p/wxt.config.ts")),
            Some(RelPath::new("wxt.config.ts"))
        );
        assert_eq!(relativize(root, &watches, Path::new("/p/srcx/a.ts")), None);
        assert_eq!(
            relativize(root, &watches, Path::new("/p/src")),
            Some(RelPath::new("src"))
        );
    }
}
