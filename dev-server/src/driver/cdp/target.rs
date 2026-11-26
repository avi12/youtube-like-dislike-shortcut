//! The targets `/json/list` reports.

use std::fmt;

use serde::Deserialize;

/// The id of a CDP target, as `/json/list` reports it.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Deserialize)]
#[serde(transparent)]
pub struct TargetId(pub String);

impl fmt::Display for TargetId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

/// What a target is; only pages are ever reloaded.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "snake_case")]
#[non_exhaustive]
pub enum TargetKind {
    /// A tab or an extension page.
    Page,
    /// A service worker, such as the extension's background.
    ServiceWorker,
    /// Any other kind (iframes, workers, browser targets).
    #[serde(other)]
    Other,
}

/// One entry of `/json/list`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CdpTarget {
    /// The target id.
    pub id: TargetId,
    /// What the target is.
    #[serde(rename = "type")]
    pub kind: TargetKind,
    /// The target URL.
    #[serde(default)]
    pub url: String,
    /// Where to open a session; missing when another client holds the target.
    #[serde(default)]
    pub web_socket_debugger_url: Option<String>,
}

impl CdpTarget {
    /// Where to open a session, when no other client holds the target.
    pub fn debugger_url(&self) -> Option<&str> {
        self.web_socket_debugger_url.as_deref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::Result;

    #[test]
    fn targets_parse_with_missing_optional_fields_and_unknown_kinds() -> Result<()> {
        let list: Vec<CdpTarget> =
            serde_json::from_str(r#"[{"id":"1","type":"page"},{"id":"2","type":"iframe"}]"#)?;
        assert_eq!(list.first().map(|item| item.url.as_str()), Some(""));
        assert_eq!(
            list.iter().map(|item| item.kind).collect::<Vec<_>>(),
            [TargetKind::Page, TargetKind::Other]
        );
        Ok(())
    }
}
