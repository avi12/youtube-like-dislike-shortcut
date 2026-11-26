//! The dev server: the launcher, the browser targets, the HMR build and the in-page payloads.

mod browsers;
mod hmr;
mod launcher;
mod payload;

pub(crate) use self::launcher::{run, RunArgs};
