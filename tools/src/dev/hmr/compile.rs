//! The dev-only HMR build. Compiles the module trees of every entrypoint that mounts Svelte
//! components into re-importable ES modules under `<output>/hmr/<entry>/`, plus the manifest the
//! in-page runtime polls. `wxt build` never runs this - the dev server's loaders point those
//! entrypoints at these modules instead of the built bundle, so the running code IS the HMR build
//! and a `.svelte` edit swaps in place.
//!
//! `.svelte` files hot swap through their own HMR proxy; a `.ts` / `.svelte.ts` module swaps by
//! re-mounting the components above it only when re-running its top level is harmless, and its
//! `$state` is carried over. Anything else is left to the rebuild and reload.

mod build;
mod output;
mod preserve_state;
mod protocol;
mod versions;
mod worker;

pub(crate) use self::build::{build_hmr, HmrBuild, HmrRequest};
pub(crate) use self::output::ContentState;
