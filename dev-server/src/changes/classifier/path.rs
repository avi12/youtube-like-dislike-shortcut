//! Which kind of edit a changed path is.

use std::collections::HashSet;

use crate::types::RelPath;

/// What kind of edit a changed path is. Decides what the next rebuild does.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum PathClass {
    /// The install marker; counts only if the installed dependency set changed.
    InstallMarker,
    /// A module the HMR build can swap into the running pages.
    HmrSource,
    /// Anything else: a full build, then the smallest update that makes it live.
    Code,
}

/// The lookup tables behind [`classify_path`], refreshed with the HMR graph after every HMR build.
#[derive(Debug, Clone, Default)]
pub struct PathRules {
    /// The file whose change may mean the installed dependencies changed.
    pub install_marker: Option<RelPath>,
    /// The files an edit can hot swap.
    pub hmr_sources: HashSet<RelPath>,
}

/// The class of one changed path.
///
/// ```
/// use dev_hot::changes::classifier::{classify_path, PathClass, PathRules};
/// use dev_hot::types::RelPath;
///
/// let rules = PathRules::default();
/// assert_eq!(classify_path(&rules, &RelPath::new("src/lib/a.ts")), PathClass::Code);
/// ```
pub fn classify_path(rules: &PathRules, path: &RelPath) -> PathClass {
    if rules.install_marker.as_ref() == Some(path) {
        return PathClass::InstallMarker;
    }
    if rules.hmr_sources.contains(path) {
        return PathClass::HmrSource;
    }
    PathClass::Code
}
