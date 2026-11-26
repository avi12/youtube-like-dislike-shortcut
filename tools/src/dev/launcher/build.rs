//! The two builds of the dev server: the production WXT build (WXT stays Node) and the HMR module
//! build over its output.

use std::path::PathBuf;

use super::error::Result;
use super::log::log_event;
use super::wxt_worker::{run_wxt_build, WxtBuildRequest};
use crate::dev::hmr::{build_hmr, HmrBuild, HmrRequest};
use crate::dev::payload::runtime_source;
use crate::output::options::{DevOptions, BUILD_MODE, MANIFEST_VERSION};

pub(super) async fn build_extension(options: &DevOptions) -> Result<()> {
    run_wxt_build(&WxtBuildRequest {
        root: &options.project_root,
        browser: options.browser.name(),
        mode: BUILD_MODE,
        manifest_version: MANIFEST_VERSION,
        out_dir: &options.out_dir,
    })
    .await
}

/// The hot entrypoints run from these modules, so every WXT build, which empties the output dir, is
/// followed by this.
pub(super) async fn build_hmr_modules(options: &DevOptions) -> Result<HmrBuild> {
    let output_dir: PathBuf = options.output_dir();
    let request = HmrRequest {
        project_root: options.project_root.clone(),
        output_dir,
        browser: options.browser,
        runtime_source: runtime_source()?,
    };
    let build = build_hmr(&request).await?;
    for line in &build.logs {
        log_event(line);
    }
    Ok(build)
}
