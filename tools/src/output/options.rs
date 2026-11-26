//! The dev server's command line: each flag falls back to a `DEV_SERVER_*` environment variable, so
//! a second instance can run side by side.

use std::env;
use std::path::{Path, PathBuf};

use clap::{Args, ValueEnum};
use serde::Serialize;

use super::error::{OutputError, Result};
use crate::firefox::MARIONETTE_DEFAULT_PORT;

/// Chromium's debug port, which the `DevTools` MCP servers connect to.
const DEFAULT_CDP_PORT: u16 = 9225;
/// Firefox's own remote debugging port.
const DEFAULT_FIREFOX_REMOTE_PORT: u16 = 9230;
const DEFAULT_OUT_DIR: &str = "build";
/// The WXT build mode, which is also the suffix of the output directory.
pub(crate) const BUILD_MODE: &str = "prod";
pub(crate) const MANIFEST_VERSION: u8 = 3;
/// Profiles live beside the repository: WXT's Vite watcher crashes on the files a running browser
/// holds locked.
const PROFILES_DIR_SUFFIX: &str = "-profiles";
const TEMPORARY_PROFILE_SUFFIX: &str = "-temporary";
const DEFAULT_START_URL: &str = "https://www.youtube.com/watch?v=aiSla-5xq3w";
const DEFAULT_LANG: &str = "en";

/// The browsers the dev server launches.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, ValueEnum)]
#[serde(rename_all = "lowercase")]
pub(crate) enum DevBrowser {
    /// Chrome for Testing.
    Chrome,
    /// The installed Microsoft Edge.
    #[default]
    Edge,
    /// The installed Firefox.
    Firefox,
    /// The installed Opera.
    Opera,
}

impl DevBrowser {
    /// The browser target name WXT and Vite take.
    pub(crate) const fn name(self) -> &'static str {
        match self {
            Self::Chrome => "chrome",
            Self::Edge => "edge",
            Self::Firefox => "firefox",
            Self::Opera => "opera",
        }
    }

    pub(crate) const fn is_firefox(self) -> bool {
        matches!(self, Self::Firefox)
    }
}

/// The operating systems the dev server tells apart.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum OsPlatform {
    /// Windows.
    Windows,
    /// Linux.
    Linux,
    /// macOS.
    MacOs,
}

impl OsPlatform {
    fn current() -> Self {
        match env::consts::OS {
            "windows" => Self::Windows,
            "macos" => Self::MacOs,
            _ => Self::Linux,
        }
    }
}

/// What the host machine says about itself; faked in tests.
#[derive(Debug, Clone)]
pub(crate) struct HostEnvironment {
    pub(crate) platform: OsPlatform,
    pub(crate) home: PathBuf,
    pub(crate) local_app_data: PathBuf,
    pub(crate) app_data: PathBuf,
    pub(crate) lang: String,
}

impl HostEnvironment {
    pub(crate) fn detect() -> Self {
        let variable = |name: &str| env::var(name).ok().filter(|value| !value.is_empty());
        let path_variable = |name: &str| variable(name).map_or_else(PathBuf::new, PathBuf::from);
        let home = variable("HOME").or_else(|| variable("USERPROFILE"));
        Self {
            platform: OsPlatform::current(),
            home: home.map_or_else(PathBuf::new, PathBuf::from),
            local_app_data: path_variable("LOCALAPPDATA"),
            app_data: path_variable("APPDATA"),
            lang: variable("LANG").unwrap_or_else(|| DEFAULT_LANG.to_owned()),
        }
    }
}

/// The flags of the dev server.
#[derive(Debug, Clone, Args)]
pub(crate) struct OptionArgs {
    /// The repository root the output and profile paths resolve against
    #[arg(long, env = "DEV_SERVER_PROJECT_ROOT", default_value = ".")]
    project_root: PathBuf,
    /// The browser to develop in
    #[arg(long, short, value_enum, default_value_t)]
    browser: DevBrowser,
    /// Keep a persistent profile, seeded from your own browser profile on its first run
    #[arg(long)]
    with_profile: bool,
    /// Remote debugging port (Chromium's `DevTools` port, or Firefox's remote agent port)
    #[arg(long, env = "DEV_SERVER_CDP_PORT", value_parser = clap::value_parser!(u16).range(1..))]
    cdp_port: Option<u16>,
    /// Firefox Marionette port
    #[arg(long, env = "DEV_SERVER_MARIONETTE_PORT", value_parser = clap::value_parser!(u16).range(1..))]
    marionette_port: Option<u16>,
    /// The dev browser's profile directory
    #[arg(long, env = "DEV_SERVER_PROFILE_DIR")]
    profile_dir: Option<PathBuf>,
    /// WXT's outDir
    #[arg(long, env = "DEV_SERVER_OUT_DIR")]
    out_dir: Option<PathBuf>,
    /// The page the browser opens
    #[arg(long, env = "DEV_SERVER_START_URL")]
    start_url: Option<String>,
    /// Keep test browsers silent
    #[arg(long, env = "DEV_SERVER_MUTE_AUDIO")]
    mute_audio: bool,
}

/// The options after flags, environment and defaults are merged.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct DevOptions {
    pub(crate) project_root: PathBuf,
    pub(crate) browser: DevBrowser,
    pub(crate) is_profile_kept: bool,
    is_profile_directory_named: bool,
    pub(crate) is_audio_muted: bool,
    pub(crate) cdp_port: u16,
    pub(crate) marionette_port: u16,
    pub(crate) profile_dir: PathBuf,
    pub(crate) out_dir: PathBuf,
    pub(crate) start_url: String,
    pub(crate) lang: String,
}

impl DevOptions {
    /// Whether the profile is the server's own throwaway one.
    pub(crate) const fn is_profile_temporary(&self) -> bool {
        !self.is_profile_kept && !self.is_profile_directory_named
    }

    /// Where WXT writes this browser's build, matching the config's `outDirTemplate`.
    pub(crate) fn output_dir(&self) -> PathBuf {
        let folder = format!("{}-mv{MANIFEST_VERSION}-{BUILD_MODE}", self.browser.name());
        self.out_dir.join(folder)
    }
}

fn default_profile_dir(project_root: &Path, browser: DevBrowser, is_kept: bool) -> PathBuf {
    let project = project_root
        .file_name()
        .map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    let suffix = if is_kept {
        ""
    } else {
        TEMPORARY_PROFILE_SUFFIX
    };
    project_root
        .parent()
        .unwrap_or(project_root)
        .join(format!("{project}{PROFILES_DIR_SUFFIX}"))
        .join(format!("{}{suffix}", browser.name()))
}

/// Merges the flags with the host's facts.
pub(crate) fn resolve_options(args: &OptionArgs, host: &HostEnvironment) -> Result<DevOptions> {
    let project_root = std::path::absolute(&args.project_root)
        .map_err(OutputError::with_path(&args.project_root))?;
    let profile_dir = args.profile_dir.as_ref().map_or_else(
        || default_profile_dir(&project_root, args.browser, args.with_profile),
        |directory| project_root.join(directory),
    );
    let default_port = if args.browser.is_firefox() {
        DEFAULT_FIREFOX_REMOTE_PORT
    } else {
        DEFAULT_CDP_PORT
    };
    let out_dir = project_root.join(
        args.out_dir
            .as_deref()
            .unwrap_or_else(|| Path::new(DEFAULT_OUT_DIR)),
    );
    Ok(DevOptions {
        browser: args.browser,
        is_profile_kept: args.with_profile,
        is_profile_directory_named: args.profile_dir.is_some(),
        is_audio_muted: args.mute_audio,
        cdp_port: args.cdp_port.unwrap_or(default_port),
        marionette_port: args.marionette_port.unwrap_or(MARIONETTE_DEFAULT_PORT),
        profile_dir,
        out_dir,
        start_url: args
            .start_url
            .clone()
            .unwrap_or_else(|| DEFAULT_START_URL.to_owned()),
        lang: host.lang.clone(),
        project_root,
    })
}

#[cfg(test)]
pub(crate) mod tests {
    use clap::Parser;

    use super::*;

    #[derive(Debug, Parser)]
    struct Wrapper {
        #[command(flatten)]
        args: OptionArgs,
    }

    pub(crate) fn host(platform: OsPlatform) -> HostEnvironment {
        HostEnvironment {
            platform,
            home: PathBuf::new(),
            local_app_data: PathBuf::new(),
            app_data: PathBuf::new(),
            lang: DEFAULT_LANG.to_owned(),
        }
    }

    pub(crate) fn resolve(arguments: &[&str]) -> Result<DevOptions> {
        let wrapper = Wrapper::try_parse_from(
            ["devtool", "--project-root", "/work/extension"]
                .into_iter()
                .chain(arguments.iter().copied()),
        )
        .map_err(|error| OutputError::Invalid(error.to_string()))?;
        resolve_options(&wrapper.args, &host(OsPlatform::Windows))
    }

    #[test]
    fn edge_is_the_default_with_a_temporary_profile_outside_the_project() -> Result<()> {
        let options = resolve(&[])?;
        assert_eq!(options.browser, DevBrowser::Edge);
        assert_eq!(options.cdp_port, DEFAULT_CDP_PORT);
        assert!(options
            .profile_dir
            .ends_with("work/extension-profiles/edge-temporary"));
        assert!(options.output_dir().ends_with("build/edge-mv3-prod"));
        Ok(())
    }

    #[test]
    fn flags_override_the_defaults() -> Result<()> {
        let options = resolve(&["-b", "firefox", "--with-profile", "--cdp-port", "9300"])?;
        assert_eq!(options.cdp_port, 9300);
        assert_eq!(options.marionette_port, MARIONETTE_DEFAULT_PORT);
        assert!(options.profile_dir.ends_with("extension-profiles/firefox"));
        assert!(options.output_dir().ends_with("build/firefox-mv3-prod"));
        Ok(())
    }

    #[test]
    fn a_zero_port_is_rejected() {
        assert!(resolve(&["--cdp-port", "0"]).is_err());
    }
}
