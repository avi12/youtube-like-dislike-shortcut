//! Chrome for Testing, Edge or Opera, started directly with the extension loaded from the build
//! output. Branded Chrome removed `--load-extension`, hence Chrome for Testing for Chrome.

use std::env;
use std::path::{Path, PathBuf};

use tokio::process::Child;

use crate::dev::launcher::browser::cft::ensure_chrome;
use crate::dev::launcher::browser::BrowserLaunch;
use crate::dev::launcher::error::{LauncherError, Result};
use crate::output::options::{DevBrowser, DevOptions, HostEnvironment, OsPlatform};
use crate::output::profile::CHROMIUM_PROFILE_DIRECTORY;
use crate::process::{find_on_path, Invocation};

const PROGRAM_FILES_VARIABLES: [&str; 2] = ["ProgramFiles(x86)", "ProgramFiles"];
const EDGE_WINDOWS_PATH: &str = "Microsoft/Edge/Application/msedge.exe";
const EDGE_MAC_BINARY: &str = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
const EDGE_LINUX_PROGRAM: &str = "microsoft-edge";
const OPERA_USER_PATH: &str = "Programs/Opera/opera.exe";
const OPERA_WINDOWS_PATH: &str = "Opera/opera.exe";
const OPERA_MAC_BINARY: &str = "/Applications/Opera.app/Contents/MacOS/Opera";
const OPERA_LINUX_PROGRAM: &str = "opera";

fn under_program_files(relative: &str) -> impl Iterator<Item = PathBuf> + '_ {
    PROGRAM_FILES_VARIABLES
        .iter()
        .filter_map(env::var_os)
        .map(move |root| PathBuf::from(root).join(relative))
}

/// The installed Edge or Opera.
fn find_installed(browser: DevBrowser, host: &HostEnvironment) -> Result<PathBuf> {
    let is_opera = browser == DevBrowser::Opera;
    let (mac, linux, windows) = if is_opera {
        (OPERA_MAC_BINARY, OPERA_LINUX_PROGRAM, OPERA_WINDOWS_PATH)
    } else {
        (EDGE_MAC_BINARY, EDGE_LINUX_PROGRAM, EDGE_WINDOWS_PATH)
    };
    let installed = match host.platform {
        OsPlatform::Windows => is_opera
            .then(|| host.local_app_data.join(OPERA_USER_PATH))
            .into_iter()
            .chain(under_program_files(windows))
            .find(|candidate| candidate.is_file()),
        OsPlatform::MacOs => Some(PathBuf::from(mac)).filter(|path| path.is_file()),
        OsPlatform::Linux => find_on_path(linux),
    };
    installed.ok_or_else(|| LauncherError::Browser(format!("could not find {}", browser.name())))
}

fn chromium_args(options: &DevOptions, output_directory: &Path) -> Vec<String> {
    let mut args = vec![
        format!("--user-data-dir={}", options.profile_directory.display()),
        format!("--load-extension={}", output_directory.display()),
        format!("--lang={}", options.lang),
        "--remote-debugging-address=127.0.0.1".to_owned(),
        format!("--remote-debugging-port={}", options.cdp_port),
        "--disable-blink-features=AutomationControlled".to_owned(),
        "--no-first-run".to_owned(),
        "--no-default-browser-check".to_owned(),
    ];
    if options.is_profile_kept {
        args.push(format!("--profile-directory={CHROMIUM_PROFILE_DIRECTORY}"));
    }
    if options.is_audio_muted {
        args.push("--mute-audio".to_owned());
    }
    args.push(options.start_url.clone());
    args
}

/// Starts the browser on the dev profile; killing the returned process closes it.
pub(super) async fn launch(launch: BrowserLaunch<'_>) -> Result<Child> {
    let BrowserLaunch {
        options,
        host,
        output_directory,
    } = launch;
    let is_chrome_for_testing = options.browser == DevBrowser::Chrome;
    let executable = if is_chrome_for_testing {
        ensure_chrome(&options.project_root, host.platform).await?
    } else {
        find_installed(options.browser, host)?
    };
    Invocation::new(executable)
        .args(chromium_args(options, output_directory))
        .spawn_kill_on_drop()
        .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use crate::dev::launcher::browser::chromium::*;
    use crate::output::options::tests::resolve;

    fn args_of(arguments: &[&str]) -> Result<Vec<String>> {
        Ok(chromium_args(&resolve(arguments)?, Path::new("out")))
    }

    #[test]
    fn the_extension_is_sideloaded_and_the_start_url_comes_last() -> Result<()> {
        let args = args_of(&[])?;
        assert!(args.contains(&"--load-extension=out".to_owned()));
        assert!(args.contains(&"--remote-debugging-port=9225".to_owned()));
        assert!(args.last().is_some_and(|url| url.starts_with("https://")));
        assert!(!args
            .iter()
            .any(|arg| arg.starts_with("--profile-directory")));
        Ok(())
    }

    #[test]
    fn a_kept_profile_runs_on_its_seeded_folder() -> Result<()> {
        let args = args_of(&["--with-profile", "--mute-audio"])?;
        assert!(args.contains(&"--profile-directory=Profile 1".to_owned()));
        assert!(args.contains(&"--mute-audio".to_owned()));
        Ok(())
    }
}
