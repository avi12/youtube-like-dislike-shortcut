//! The [`Host`] of the hot loop: builds, and updating the running browser with the smallest change
//! between two builds.

use std::collections::BTreeMap;
use std::sync::Arc;

use dev_hot::orchestrator::{HmrOutcome, Host};
use tokio::sync::Mutex;
use tokio::time::Instant;

use crate::dev::browsers::{Reinjection, ReloadTarget};
use crate::dev::hmr::{ContentState, HMR_OUT_SUBDIR};
use crate::dev::launcher::build::{build_extension, build_hmr_modules};
use crate::dev::launcher::error::Result;
use crate::dev::launcher::log::{format_elapsed, log_event};
use crate::dev::payload::patch_built_output;
use crate::output::manifest::ExtensionManifest;
use crate::output::options::DevOptions;
use crate::output::reload::{
    list_injections, plan_reload, take_build_snapshot, BuildSnapshot, ExtensionReloadPlan,
    ReloadPlan,
};
use crate::output::sync::sync_directory;

const NO_CHANGES: &str = "No output changes - skipped reload";
const PROFILE_REUSED_REASON: &str = "a kept profile may run what it cached before this build";

#[derive(Default)]
struct State {
    target: Option<Arc<dyn ReloadTarget>>,
    /// The build the browser runs.
    applied: BuildSnapshot,
    /// Whether the newest WXT build still needs the dev patches.
    is_unpatched: bool,
    /// What the running content scripts were built from, outside their components.
    content_scripts: BTreeMap<String, ContentState>,
}

/// The launcher side of the hot loop.
pub(super) struct DevHost {
    options: DevOptions,
    state: Mutex<State>,
}

fn host_error(error: impl std::fmt::Display) -> dev_hot::Error {
    dev_hot::Error::Host {
        message: error.to_string(),
    }
}

/// Why the running content scripts cannot take the newer build in place.
fn describe_content_change(
    running: &BTreeMap<String, ContentState>,
    next: &BTreeMap<String, ContentState>,
) -> Option<String> {
    if !running.keys().eq(next.keys()) {
        return Some("the set of hot content scripts changed".to_owned());
    }
    running
        .iter()
        .zip(next.values())
        .find_map(|((name, old), new)| {
            let is_code_changed = old.version != new.version;
            let is_graph_changed = old.vendor_hash != new.vendor_hash;
            let reason = if is_code_changed {
                "code outside its components changed"
            } else if is_graph_changed {
                "its dependency graph changed"
            } else {
                return None;
            };
            Some(format!("content script {name}: {reason}"))
        })
}

fn describe_reload(plan: &ExtensionReloadPlan, reinjection: &Reinjection) -> String {
    let reasons = plan.reasons.join("; ");
    let Reinjection {
        tab_count,
        frame_count,
        failures,
    } = reinjection;
    let injection_failures = if failures.is_empty() {
        String::new()
    } else {
        format!(" - injection failed: {}", failures.join("; "))
    };
    format!(
        "Reloaded extension ({reasons}) - content scripts replaced in {frame_count} frame(s) of {tab_count} tab(s), no tab reloaded{injection_failures}"
    )
}

async fn apply(target: &dyn ReloadTarget, plan: &ReloadPlan) -> Result<String> {
    let outcome = match plan {
        ReloadPlan::None => NO_CHANGES.to_owned(),
        ReloadPlan::RefreshPages(refresh) => {
            let refreshed = target.refresh_pages(refresh).await.map_err(host_error)?;
            let pages = if refreshed.is_empty() {
                "none open".to_owned()
            } else {
                format!("reloaded {}", refreshed.join(", "))
            };
            format!("{refresh} changed - {pages}; extension and tabs untouched")
        }
        ReloadPlan::ReloadExtension(reload) => {
            let reinjection = target.reload_extension(reload).await.map_err(host_error)?;
            describe_reload(reload, &reinjection)
        }
    };
    Ok(outcome)
}

impl DevHost {
    pub(super) fn new(options: DevOptions) -> Self {
        Self {
            options,
            state: Mutex::default(),
        }
    }

    fn snapshot(&self) -> Result<BuildSnapshot> {
        let skipped = format!("{HMR_OUT_SUBDIR}/");
        Ok(take_build_snapshot(
            &self.options.output_directory(),
            &skipped,
        )?)
    }

    /// Hands over the launched browser, which runs the current build. A kept profile can hold a
    /// background script cached before it, so it gets one reload.
    pub(super) async fn attach(&self, target: Arc<dyn ReloadTarget>) -> Result<()> {
        let mut state = self.state.lock().await;
        state.applied = self.snapshot()?;
        state.target = Some(Arc::clone(&target));
        if !self.options.is_profile_kept {
            return Ok(());
        }
        let manifest = ExtensionManifest::read(&self.options.output_directory())?;
        let plan = ExtensionReloadPlan {
            reasons: vec![PROFILE_REUSED_REASON.to_owned()],
            injections: list_injections(&manifest)?,
        };
        match target.reload_extension(&plan).await {
            Ok(reinjection) => log_event(&describe_reload(&plan, &reinjection)),
            Err(error) => tracing::warn!("Could not reload the extension: {error}"),
        }
        Ok(())
    }

    async fn build_hmr_and_patch(&self) -> Result<HmrOutcome> {
        let build = build_hmr_modules(&self.options).await?;
        let mut state = self.state.lock().await;
        let full_reload_reason = if state.is_unpatched {
            patch_built_output(
                &self.options.staged_output_directory(),
                &build.hot_entries,
                &build.static_styles,
            )?;
            state.is_unpatched = false;
            state.content_scripts = build.content_scripts;
            None
        } else {
            describe_content_change(&state.content_scripts, &build.content_scripts)
        };
        sync_directory(
            &self.options.staged_output_directory(),
            &self.options.output_directory(),
        )?;
        Ok(HmrOutcome {
            hmr_source_files: build.source_modules,
            full_reload_reason,
        })
    }

    async fn apply_newest_build(&self, started: Instant) -> Result<()> {
        let next = self.snapshot()?;
        let mut state = self.state.lock().await;
        let plan = plan_reload(&state.applied, &next)?;
        let Some(target) = state.target.clone() else {
            return Ok(());
        };
        let outcome = apply(target.as_ref(), &plan).await?;
        let elapsed = u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX);
        log_event(&format!("{outcome} ({})", format_elapsed(elapsed)));
        state.applied = next;
        Ok(())
    }
}

impl Host for DevHost {
    async fn build_extension(&self) -> dev_hot::Result<()> {
        build_extension(&self.options).await.map_err(host_error)?;
        self.state.lock().await.is_unpatched = true;
        Ok(())
    }

    async fn rebuild_hmr(&self) -> dev_hot::Result<HmrOutcome> {
        self.build_hmr_and_patch().await.map_err(host_error)
    }

    async fn apply_update(&self, started: Instant) -> dev_hot::Result<()> {
        self.apply_newest_build(started).await.map_err(host_error)
    }
}

#[cfg(test)]
mod tests {
    use crate::dev::launcher::host::*;

    fn states(version: &str) -> BTreeMap<String, ContentState> {
        BTreeMap::from([(
            "watcher".to_owned(),
            ContentState {
                version: version.to_owned(),
                vendor_hash: "v".to_owned(),
            },
        )])
    }

    #[test]
    fn only_component_edits_leave_the_content_scripts_swappable() {
        let running = states("1");
        assert_eq!(describe_content_change(&running, &states("1")), None);
        let code = describe_content_change(&running, &states("2"));
        assert!(code.is_some_and(|reason| reason.contains("outside its components")));
        assert!(describe_content_change(&running, &BTreeMap::new()).is_some());
    }
}
