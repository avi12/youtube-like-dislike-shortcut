//! Running other programs.

use std::ffi::{OsStr, OsString};
use std::path::PathBuf;
use std::process::Stdio;

use thiserror::Error;
use tokio::process::{Child, Command};

/// A spawned program failed to start or exited unsuccessfully.
#[derive(Debug, Error)]
pub(crate) enum ProcessError {
    /// The program could not be started.
    #[error("could not start `{command_line}`: {source}")]
    Spawn {
        /// The program and its arguments.
        command_line: String,
        /// Why it did not start.
        #[source]
        source: std::io::Error,
    },
    /// The program ran and exited with a failure.
    #[error("`{command_line}` failed (exit code {}): {stderr}", .code.map_or_else(|| "none".to_owned(), |code| code.to_string()))]
    Failed {
        /// The program and its arguments.
        command_line: String,
        /// The exit code, absent when a signal ended it.
        code: Option<i32>,
        /// The trimmed standard error.
        stderr: String,
    },
}

/// The first file of `name` found on `PATH`.
pub(crate) fn find_on_path(name: &str) -> Option<PathBuf> {
    let paths = std::env::var_os("PATH")?;
    std::env::split_paths(&paths)
        .map(|directory| directory.join(name))
        .find(|candidate| candidate.is_file())
}

/// A program and its arguments, ready to run.
#[derive(Debug, Clone)]
pub(crate) struct Invocation {
    program: OsString,
    args: Vec<OsString>,
    environment: Vec<(OsString, OsString)>,
}

impl Invocation {
    /// A program with no arguments.
    pub(crate) fn new(program: impl Into<OsString>) -> Self {
        Self {
            program: program.into(),
            args: Vec::new(),
            environment: Vec::new(),
        }
    }

    /// Appends several arguments.
    pub(crate) fn args<I, S>(mut self, args: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<OsStr>,
    {
        self.args
            .extend(args.into_iter().map(|arg| arg.as_ref().to_owned()));
        self
    }

    /// Sets one environment variable for the program.
    pub(crate) fn env(mut self, name: impl Into<OsString>, value: impl Into<OsString>) -> Self {
        self.environment.push((name.into(), value.into()));
        self
    }

    fn command_line(&self) -> String {
        std::iter::once(&self.program)
            .chain(&self.args)
            .map(|part| part.to_string_lossy())
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn command(&self) -> Command {
        let mut command = Command::new(&self.program);
        command
            .args(&self.args)
            .envs(self.environment.iter().cloned());
        command
    }

    fn spawn_error(&self, source: std::io::Error) -> ProcessError {
        ProcessError::Spawn {
            command_line: self.command_line(),
            source,
        }
    }

    /// Runs to completion capturing stdout and stderr; a non-zero exit carries the stderr.
    pub(crate) async fn capture_checked(&self) -> Result<String, ProcessError> {
        let output = self
            .command()
            .stdin(Stdio::null())
            .output()
            .await
            .map_err(|source| self.spawn_error(source))?;
        if !output.status.success() {
            return Err(ProcessError::Failed {
                command_line: self.command_line(),
                code: output.status.code(),
                stderr: String::from_utf8_lossy(&output.stderr).trim().to_owned(),
            });
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
    }

    /// Starts the program and keeps it running; dropping the handle kills it.
    pub(crate) fn spawn_kill_on_drop(&self) -> Result<Child, ProcessError> {
        self.command()
            .stdin(Stdio::null())
            .kill_on_drop(true)
            .spawn()
            .map_err(|source| self.spawn_error(source))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_line_joins_program_and_arguments() {
        let invocation = Invocation::new("curl").args(["--silent", "x"]);
        assert_eq!(invocation.command_line(), "curl --silent x");
    }

    #[tokio::test]
    async fn a_missing_program_is_a_spawn_error() {
        let outcome = Invocation::new("devtool-no-such-program")
            .capture_checked()
            .await;
        assert!(matches!(outcome, Err(ProcessError::Spawn { .. })));
    }

    #[test]
    fn an_environment_variable_reaches_the_command() {
        let invocation = Invocation::new("program").env("DEVTOOL_SEAM", "1");
        let command = invocation.command();
        assert!(command
            .as_std()
            .get_envs()
            .any(|(name, value)| name == "DEVTOOL_SEAM" && value == Some(OsStr::new("1"))));
    }
}
