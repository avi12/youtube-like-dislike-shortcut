//! The latch of a debounce window and the plan it drains into.

use crate::changes::classifier::PathClass;

/// What a debounce window has collected so far.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum PendingState {
    /// Nothing changed.
    #[default]
    Idle,
    /// Only hot swappable modules changed.
    HotSwap,
    /// Something that needs a full build changed.
    Full,
}

impl PendingState {
    /// Folds one changed path in. A full build is never downgraded by a later hot swappable edit.
    pub fn record(&mut self, class: PathClass) {
        *self = match (*self, class) {
            (Self::Idle | Self::HotSwap, PathClass::HmrSource) => Self::HotSwap,
            _ => Self::Full,
        };
    }

    /// Drains the window.
    #[must_use]
    pub fn take(&mut self) -> Self {
        std::mem::take(self)
    }
}

/// What to do for one drained window.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum RebuildPlan {
    /// Rebuild the HMR modules only.
    HotSwap,
    /// Build everything and apply the new build to the browser.
    Full,
}

/// Turns a window's state into a plan; `None` when nothing is pending.
pub const fn plan_rebuild(state: PendingState) -> Option<RebuildPlan> {
    match state {
        PendingState::Idle => None,
        PendingState::HotSwap => Some(RebuildPlan::HotSwap),
        PendingState::Full => Some(RebuildPlan::Full),
    }
}
