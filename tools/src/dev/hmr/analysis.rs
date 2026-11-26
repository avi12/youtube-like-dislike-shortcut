//! Which source files an edit can hot swap, and why the others need a reload.

pub(super) mod hot_sources;
mod reasons;
pub(super) mod side_effects;
pub(super) mod wxt_resolution;
