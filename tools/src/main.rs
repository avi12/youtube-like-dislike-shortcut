//! `devtool`: the extension's dev server.
//!
//! Adapted from the `tools` crate of youtube-downloader. `devtool dev` builds the extension,
//! launches one browser with it sideloaded
//! and keeps both current while the hot loop of `dev_hot` watches the source:
//! - `.svelte` components hot swap in place, in the popup and in content script UIs
//! - anything else is rebuilt and compared with the previous build file by file: a change only
//!   extension pages see refreshes them, any other one reloads the extension and the tabs its
//!   content scripts run in

mod cdp;
mod dev;
mod firefox;
mod output;
mod process;

use clap::{Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(name = "devtool", version, about)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Runs the dev server until the browser closes or Ctrl+C
    Dev(dev::RunArgs),
}

#[tokio::main]
async fn main() -> std::process::ExitCode {
    let Command::Dev(args) = Cli::parse().command;
    match dev::run(args).await {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            std::process::ExitCode::FAILURE
        }
    }
}
