//! The static-bundle catch-up latch.

use tokio::time::Instant;

use super::STATIC_CATCH_UP_IDLE;

/// Whether the extension build output still matches the source: a hot swap rebuilds only the HMR
/// modules, so the bundle is caught up once the edits go quiet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum StaticBundle {
    /// The last build covers every edit.
    Current,
    /// Hot swaps happened since the last build.
    Stale,
    /// Stale, with the catch-up scheduled.
    CatchUpDue(Instant),
}

impl StaticBundle {
    pub(super) const fn deadline(self) -> Option<Instant> {
        match self {
            Self::CatchUpDue(deadline) => Some(deadline),
            Self::Current | Self::Stale => None,
        }
    }

    pub(super) const fn is_stale(self) -> bool {
        !matches!(self, Self::Current)
    }

    /// A new edit postpones the catch-up.
    pub(super) const fn without_deadline(self) -> Self {
        match self {
            Self::CatchUpDue(_) => Self::Stale,
            other => other,
        }
    }

    pub(super) fn schedule_after_drain(self, now: Instant) -> Self {
        if self.is_stale() {
            return Self::CatchUpDue(now + STATIC_CATCH_UP_IDLE);
        }
        self
    }
}
