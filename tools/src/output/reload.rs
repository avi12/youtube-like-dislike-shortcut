//! Diffing two builds and planning the smallest update that makes the changes live.

mod plan;
mod snapshot;

pub(crate) use plan::{
    list_injections, plan_reload, ExtensionReloadPlan, Injection, PageRefreshPlan, ReloadPlan,
};
pub(crate) use snapshot::{take_build_snapshot, BuildSnapshot};
