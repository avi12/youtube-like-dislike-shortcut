//! The built manifest as the dev server reads it: the extension's name and id, content scripts,
//! background files and match patterns.

use std::fs;
use std::path::Path;

pub(crate) use dev_hot::changes::MANIFEST_FILE_NAME as MANIFEST_FILE;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::output::error::{OutputError, Result};

const ALL_URLS_PATTERN: &str = "<all_urls>";
const ANY_HOST: &str = "*";
const ANY_SUBDOMAIN_PREFIX: &str = "*.";
const SCHEME_SEPARATOR: &str = "://";

/// The manifest lists the dev server appends to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ManifestList {
    Permissions,
    HostPermissions,
    WebAccessibleResources,
}

impl ManifestList {
    const fn key(self) -> &'static str {
        match self {
            Self::Permissions => "permissions",
            Self::HostPermissions => "host_permissions",
            Self::WebAccessibleResources => "web_accessible_resources",
        }
    }
}

/// The world a content script runs in.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
pub(crate) enum ContentScriptWorld {
    /// The extension's isolated world.
    #[default]
    #[serde(rename = "ISOLATED")]
    Isolated,
    /// The page's own world.
    #[serde(rename = "MAIN")]
    Main,
}

/// One entry of the manifest's `content_scripts`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub(crate) struct ContentScriptEntry {
    #[serde(default, rename = "js")]
    pub(crate) scripts: Vec<String>,
    #[serde(default)]
    pub(crate) matches: Vec<String>,
    #[serde(default)]
    pub(crate) world: ContentScriptWorld,
    #[serde(default, rename = "css")]
    pub(crate) style_sheets: Vec<String>,
    #[serde(default, rename = "all_frames")]
    pub(crate) is_all_frames: bool,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct Background {
    service_worker: Option<String>,
    scripts: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct BrowserSettings {
    gecko: Option<GeckoSettings>,
}

#[derive(Debug, Deserialize)]
struct GeckoSettings {
    id: Option<String>,
}

/// The parts of the manifest the dev server reads.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct ManifestFields {
    name: String,
    content_scripts: Vec<ContentScriptEntry>,
    background: Background,
    browser_specific_settings: Option<BrowserSettings>,
}

/// The parsed `manifest.json`, kept as JSON so unknown keys survive a rewrite.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ExtensionManifest(pub(crate) Value);

impl Default for ExtensionManifest {
    fn default() -> Self {
        Self(Value::Object(Map::new()))
    }
}

impl ExtensionManifest {
    pub(crate) fn read(output_directory: &Path) -> Result<Self> {
        let path = output_directory.join(MANIFEST_FILE);
        let text = fs::read_to_string(&path).map_err(OutputError::with_path(&path))?;
        Ok(Self(serde_json::from_str(&text)?))
    }

    pub(crate) fn write(&self, output_directory: &Path) -> Result<()> {
        let path = output_directory.join(MANIFEST_FILE);
        let text = serde_json::to_string_pretty(&self.0)?;
        fs::write(&path, text).map_err(OutputError::with_path(&path))
    }

    fn fields(&self) -> Result<ManifestFields> {
        Ok(ManifestFields::deserialize(&self.0)?)
    }

    /// The extension's name, which tells it apart on the browser's extensions page.
    pub(crate) fn name(&self) -> Result<String> {
        Ok(self.fields()?.name)
    }

    /// Firefox's runtime id and RDP's add-on id.
    pub(crate) fn gecko_id(&self) -> Result<String> {
        let settings = self.fields()?.browser_specific_settings;
        settings
            .and_then(|settings| settings.gecko)
            .and_then(|gecko| gecko.id)
            .ok_or_else(|| OutputError::Invalid("the manifest has no gecko id".to_owned()))
    }

    pub(crate) fn content_scripts(&self) -> Result<Vec<ContentScriptEntry>> {
        Ok(self.fields()?.content_scripts)
    }

    /// The service worker, or the scripts of the background page.
    pub(crate) fn background_files(&self) -> Result<Vec<String>> {
        let background = self.fields()?.background;
        Ok(background
            .service_worker
            .into_iter()
            .chain(background.scripts)
            .collect())
    }

    /// Appends the entries a list does not hold yet, creating the list when missing.
    pub(crate) fn extend_list(&mut self, list: ManifestList, entries: Vec<Value>) -> Result<()> {
        let invalid =
            || OutputError::Invalid(format!("manifest key {} is not an array", list.key()));
        let items = self
            .0
            .as_object_mut()
            .ok_or_else(invalid)?
            .entry(list.key())
            .or_insert_with(|| Value::Array(Vec::new()))
            .as_array_mut()
            .ok_or_else(invalid)?;
        for entry in entries {
            if !items.contains(&entry) {
                items.push(entry);
            }
        }
        Ok(())
    }
}

/// A glob where `*` is any run of characters, as regular expression source.
fn glob_regex(glob: &str) -> String {
    glob.split('*')
        .map(regex::escape)
        .collect::<Vec<_>>()
        .join(".*")
}

fn host_regex(host: &str) -> String {
    let is_any_host = host == ANY_HOST;
    if is_any_host {
        return "[^/]*".to_owned();
    }
    host.strip_prefix(ANY_SUBDOMAIN_PREFIX).map_or_else(
        || regex::escape(host),
        |domain| format!("([^/]+[.])?{}", regex::escape(domain)),
    )
}

/// Chrome's match pattern semantics as a regular expression over a frame's URL.
pub(crate) fn url_regex(pattern: &str) -> String {
    let is_every_url = pattern == ALL_URLS_PATTERN;
    let parts = pattern
        .split_once(SCHEME_SEPARATOR)
        .and_then(|(scheme, rest)| Some((scheme, rest.split_at_checked(rest.find('/')?)?)));
    let Some((scheme, (host, path))) = parts.filter(|_| !is_every_url) else {
        return "^(https?|file|ftp)://".to_owned();
    };
    let is_any_web_scheme = scheme == "*";
    let scheme = if is_any_web_scheme {
        "https?".to_owned()
    } else {
        regex::escape(scheme)
    };
    format!(
        "^{scheme}{SCHEME_SEPARATOR}{}{}(#.*)?$",
        host_regex(host),
        glob_regex(path)
    )
}

#[cfg(test)]
mod tests {
    use regex::Regex;
    use serde_json::json;

    use crate::output::manifest::*;

    fn is_matching(url: &str, pattern: &str) -> bool {
        Regex::new(&url_regex(pattern)).is_ok_and(|regex| regex.is_match(url))
    }

    #[test]
    fn subdomain_wildcard_matches_bare_and_nested_hosts() {
        let pattern = "*://*.youtube.com/*";
        for url in [
            "https://youtube.com/watch?v=1",
            "https://www.youtube.com/",
            "http://music.youtube.com/a#t",
        ] {
            assert!(is_matching(url, pattern), "{url}");
        }
        assert!(!is_matching("https://notyoutube.com/a", pattern));
        assert!(!is_matching("ftp://youtube.com/a", pattern));
    }

    #[test]
    fn paths_and_all_urls() {
        let embed = "https://www.youtube.com/embed/*";
        assert!(is_matching("https://www.youtube.com/embed/x", embed));
        assert!(!is_matching("https://www.youtube.com/watch", embed));
        assert!(is_matching("file:///tmp/a", ALL_URLS_PATTERN));
    }

    #[test]
    fn content_scripts_and_background_are_read_with_defaults() -> Result<()> {
        let manifest = ExtensionManifest(json!({
            "name": "n",
            "background": {"scripts": ["background.js"]},
            "content_scripts": [
                {"js": ["a.js"], "world": "MAIN", "matches": ["*://x/*"]},
                {"js": ["b.js"], "matches": ["*://x/*", "*://y/*"]}
            ]
        }));
        let scripts = manifest.content_scripts()?;
        assert_eq!(
            scripts.iter().map(|entry| entry.world).collect::<Vec<_>>(),
            [ContentScriptWorld::Main, ContentScriptWorld::Isolated]
        );
        assert_eq!(manifest.background_files()?, ["background.js"]);
        assert!(manifest.gecko_id().is_err());
        Ok(())
    }
}
