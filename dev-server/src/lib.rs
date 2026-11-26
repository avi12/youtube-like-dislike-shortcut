//! Hot loop of the extension dev server.
//!
//! Adapted from the `dev-server` crate of youtube-downloader (Apache License 2.0, see `LICENSE`).
//! The `devtool` binary in `../tools` builds the extension and launches the browser, then hands the
//! loop its [`orchestrator::Host`]: this crate watches the files, decides what a change means and
//! asks the host to build, hot swap or apply the new build to the browser.
//!
//! - [`types`], [`error`]: newtypes and the error enum
//! - [`changes::watcher`]: polling file watcher with debounce
//! - [`changes::classifier`]: pure classification and rebuild decisions
//! - [`changes::workspace`]: disk access behind a trait
//! - [`driver::cdp`], [`driver::rdp`]: the wire types of the two browser debugging protocols
//! - [`orchestrator`]: the `select!` main loop
//!
//! # Conventions
//!
//! No `unsafe`, no `unwrap`/`expect`/`panic` outside tests, errors are [`Error`] with `?`.
//! Channels are bounded, cancellation is a `CancellationToken`, blocking file and hash work runs
//! under `spawn_blocking`. Tests are deterministic: `tokio::time::pause`, never real sleeps.

pub mod changes;
pub mod driver;
pub mod error;
pub mod orchestrator;
pub mod types;

pub use error::{Error, Result};
