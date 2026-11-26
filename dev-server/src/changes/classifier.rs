//! Pure change-classification logic: which kind of edit a path is and what to do after a debounced
//! batch. No I/O except [`hash_installed_lockfile`], which is blocking and must run under
//! `spawn_blocking`.

mod install;
mod path;
mod pending;

pub use install::{hash_installed_lockfile, InstallGate};
pub use path::{classify_path, PathClass, PathRules};
pub use pending::{plan_rebuild, PendingState, RebuildPlan};
