//! The two builds of the dev server: the production WXT build (WXT stays Node) and the HMR module
//! build over its output.

use std::path::PathBuf;

use crate::dev::hmr::{build_hmr, HmrBuild, HmrRequest};
use crate::dev::launcher::error::Result;
use crate::dev::launcher::log::log_event;
use crate::dev::launcher::wxt_worker::{run_wxt_build, WxtBuildRequest};
use crate::dev::payload::runtime_source;
use crate::output::options::{DevOptions, BUILD_MODE, MANIFEST_VERSION};

pub(super) async fn build_extension(options: &DevOptions) -> Result<()> {
    run_wxt_build(&WxtBuildRequest {
        root: &options.project_root,
        browser: options.browser.name(),
        mode: BUILD_MODE,
        manifest_version: MANIFEST_VERSION,
        out_directory: &options.out_directory,
    })
    .await
}

/// The hot entrypoints run from these modules, so every WXT build, which empties the output dir, is
/// followed by this.
pub(super) async fn build_hmr_modules(options: &DevOptions) -> Result<HmrBuild> {
    let output_directory: PathBuf = options.output_directory();
    let request = HmrRequest {
        project_root: options.project_root.clone(),
        output_directory,
        browser: options.browser,
        runtime_source: runtime_source()?,
    };
    let build = build_hmr(&request).await?;
    for line in &build.logs {
        log_event(line);
    }
    Ok(build)
}
