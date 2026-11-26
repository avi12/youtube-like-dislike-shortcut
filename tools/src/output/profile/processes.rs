//! Stopping the browser instances that run on one profile directory, found by command line and
//! stopped by process id, never by program name.

use std::path::Path;

use crate::output::error::Result;
use crate::output::options::{DevBrowser, OsPlatform};
use crate::process::Invocation;

const LIST_WINDOWS_PROCESSES: &str = "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine } | ForEach-Object { \"$($_.ProcessId)`t$($_.CommandLine)\" }";
/// The argument a browser names its profile with. Only a process carrying it is a browser on that
/// profile: a shell or this server naming the same directory is not.
const CHROMIUM_PROFILE_ARGUMENT: &str = "--user-data-dir=";
const FIREFOX_PROFILE_ARGUMENT: &str = " -profile ";

/// One running process: its id and full command line.
#[derive(Debug, Clone, PartialEq, Eq)]
struct RunningProcess {
    pid: u32,
    command_line: String,
}

fn continues_a_path_segment(character: char) -> bool {
    character.is_alphanumeric() || matches!(character, '_' | '-' | '.')
}

fn mentions_profile(command_line: &str, profile: &str, is_case_insensitive: bool) -> bool {
    let (haystack, needle) = if is_case_insensitive {
        (command_line.to_lowercase(), profile.to_lowercase())
    } else {
        (command_line.to_owned(), profile.to_owned())
    };
    haystack.match_indices(&needle).any(|(start, found)| {
        haystack
            .get(start + found.len()..)
            .and_then(|rest| rest.chars().next())
            .is_none_or(|next| !continues_a_path_segment(next))
    })
}

/// The ids of the browser processes whose command line names `profile`, and of no other; none when
/// the profile path is empty or nothing matches.
fn pids_on_profile(
    processes: &[RunningProcess],
    browser: DevBrowser,
    profile: &str,
    is_case_insensitive: bool,
) -> Vec<u32> {
    let profile = profile.trim_end_matches(['/', '\\']);
    if profile.is_empty() {
        return Vec::new();
    }
    let argument = if browser.is_firefox() {
        FIREFOX_PROFILE_ARGUMENT
    } else {
        CHROMIUM_PROFILE_ARGUMENT
    };
    processes
        .iter()
        .filter(|process| process.command_line.contains(argument))
        .filter(|process| mentions_profile(&process.command_line, profile, is_case_insensitive))
        .map(|process| process.pid)
        .collect()
}

fn parse_windows_listing(listing: &str) -> Vec<RunningProcess> {
    listing
        .lines()
        .filter_map(|line| {
            let (pid, command_line) = line.split_once('\t')?;
            Some(RunningProcess {
                pid: pid.trim().parse().ok()?,
                command_line: command_line.trim().to_owned(),
            })
        })
        .collect()
}

fn list_linux_processes() -> Vec<RunningProcess> {
    let Ok(entries) = std::fs::read_dir("/proc") else {
        return Vec::new();
    };
    entries
        .filter_map(std::result::Result::ok)
        .filter_map(|entry| {
            let pid = entry.file_name().to_str()?.parse().ok()?;
            let raw = std::fs::read(entry.path().join("cmdline")).ok()?;
            let command_line = String::from_utf8_lossy(&raw).replace('\0', " ");
            Some(RunningProcess { pid, command_line })
        })
        .collect()
}

async fn captured(program: &str, arguments: &[&str]) -> Result<String> {
    Ok(Invocation::new(program)
        .args(arguments)
        .capture_checked()
        .await?)
}

async fn list_processes(platform: OsPlatform) -> Result<Vec<RunningProcess>> {
    match platform {
        OsPlatform::Linux => Ok(list_linux_processes()),
        OsPlatform::Windows => {
            let listing = captured(
                "powershell",
                &[
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    LIST_WINDOWS_PROCESSES,
                ],
            )
            .await?;
            Ok(parse_windows_listing(&listing))
        }
        OsPlatform::MacOs => Ok(Vec::new()),
    }
}

/// A process that ended between the listing and now is not an error.
async fn terminate(platform: OsPlatform, pid: u32) {
    let pid = pid.to_string();
    let outcome = match platform {
        OsPlatform::Windows => captured("taskkill", &["/PID", &pid, "/F"]).await,
        _ => captured("kill", &["-TERM", &pid]).await,
    };
    if let Err(error) = outcome {
        tracing::debug!("could not stop process {pid}: {error}");
    }
}

/// Terminates every browser process whose command line names `profile`.
pub(super) async fn stop_on_profile(
    platform: OsPlatform,
    browser: DevBrowser,
    profile: &Path,
) -> Result<()> {
    let processes = list_processes(platform).await?;
    let pids = pids_on_profile(
        &processes,
        browser,
        &profile.display().to_string(),
        platform == OsPlatform::Windows,
    );
    for pid in pids {
        terminate(platform, pid).await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn process(pid: u32, command_line: &str) -> RunningProcess {
        RunningProcess {
            pid,
            command_line: command_line.to_owned(),
        }
    }

    #[test]
    fn only_browsers_naming_this_profile_match() {
        let processes = [
            process(1, r"msedge.exe --user-data-dir=C:\p\edge --lang=en"),
            process(2, r"msedge.exe --user-data-dir=C:\p\edge-temporary"),
            process(3, r"devtool.exe dev --profile-dir C:\p\edge"),
            process(4, "msedge.exe"),
        ];
        let pids = pids_on_profile(&processes, DevBrowser::Edge, r"C:\p\edge", false);
        assert_eq!(pids, [1]);
    }

    #[test]
    fn firefox_names_its_profile_with_its_own_argument() {
        let processes = [
            process(1, "firefox -profile /p/firefox -no-remote"),
            process(2, "devtool dev --profile-dir /p/firefox"),
        ];
        let pids = pids_on_profile(&processes, DevBrowser::Firefox, "/p/firefox/", false);
        assert_eq!(pids, [1]);
    }

    #[test]
    fn nothing_matches_an_unused_or_empty_profile() {
        let processes = [process(1, "chrome --user-data-dir=/p/a")];
        let none: [u32; 0] = [];
        for profile in ["/p/b", ""] {
            let pids = pids_on_profile(&processes, DevBrowser::Chrome, profile, false);
            assert_eq!(pids, none);
        }
    }

    #[test]
    fn windows_paths_match_regardless_of_case() {
        let processes = [process(1, r"chrome.exe --user-data-dir=C:\Repo\Profile")];
        let pids = pids_on_profile(&processes, DevBrowser::Chrome, r"c:\repo\profile", true);
        assert_eq!(pids, [1]);
    }

    #[test]
    fn the_windows_listing_parses_pid_and_command_line() {
        let listing = "12\tchrome.exe --x\r\nnoise\r\n";
        assert_eq!(
            parse_windows_listing(listing),
            [process(12, "chrome.exe --x")]
        );
    }
}
