//! The build output as the dev server reads and writes it: the options, the manifest, the dev
//! patches, the reload plan between two builds and the dev browser's profile.

pub(crate) mod error;
pub(crate) mod manifest;
pub(crate) mod options;
pub(crate) mod profile;
pub(crate) mod reload;
pub(crate) mod sync;
