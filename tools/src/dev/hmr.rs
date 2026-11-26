//! The HMR build of the dev server: compiles the Svelte component trees into re-importable modules
//! and works out which edits can hot swap and which need the extension reloaded.

mod analysis;
mod chunks;
mod compile;
mod config;
mod entries;
mod error;

pub(crate) use self::compile::{build_hmr, ContentState, HmrBuild, HmrRequest};
pub(crate) use self::config::{
    HMR_MANIFEST_PATH, HMR_OUT_SUBDIR, HMR_PAGE_LOADER_FILE, HMR_RUNTIME_FILE,
};
pub(crate) use self::entries::{EntryKind, Entrypoint};
pub(crate) use self::error::HmrError;
