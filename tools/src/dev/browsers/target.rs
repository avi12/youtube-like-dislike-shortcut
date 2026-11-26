//! The contract between the dev server and a browser target.

use std::future::Future;
use std::pin::Pin;

use crate::dev::browsers::error::Result;
use crate::output::reload::{ExtensionReloadPlan, PageRefreshPlan};

/// A boxed future, so a target can sit behind `dyn ReloadTarget`.
pub(crate) type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = Result<T>> + Send + 'a>>;

/// What a Chromium or Firefox target can do to the extension under development.
pub(crate) trait ReloadTarget: Send + Sync {
    /// Reloads the extension, then every tab matching one of the plan's patterns; resolves to the
    /// number of tabs reloaded.
    fn reload_extension<'a>(&'a self, plan: &'a ExtensionReloadPlan) -> BoxFuture<'a, usize>;

    /// Refreshes the open extension pages a change touched, leaving the extension and the tabs
    /// alone; resolves to the names of the pages reloaded.
    fn refresh_pages<'a>(&'a self, plan: &'a PageRefreshPlan) -> BoxFuture<'a, Vec<String>>;
}
