//! The built manifest as the dev server reads it: the extension's name and id, content scripts,
//! background files and match patterns.

use std::fs;
use std::path::Path;

pub(crate) use dev_hot::changes::MANIFEST_FILE_NAME as MANIFEST_FILE;
use serde::Deserialize;
use serde_json::{Map, Value};

use crate::output::error::{OutputError, Result};

const ALL_URLS_PATTERN: &str = "<all_urls>";
const ANY_HOST: &str = "*";
const ANY_SUBDOMAIN_PREFIX: &str = "*.";
const SCHEME_SEPARATOR: &str = "://";
const PATTERN_SCHEMES: [&str; 7] = ["*", "http", "https", "ws", "wss", "file", "ftp"];
const ANY_WEB_SCHEMES: [&str; 2] = ["http", "https"];
const WEB_ACCESSIBLE_RESOURCES_KEY: &str = "web_accessible_resources";

/// The world a content script runs in.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
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

    /// The match patterns of every content script, each named once.
    pub(crate) fn content_script_matches(&self) -> Result<Vec<String>> {
        let mut patterns: Vec<String> = Vec::new();
        for pattern in self
            .content_scripts()?
            .into_iter()
            .flat_map(|entry| entry.matches)
        {
            if !patterns.contains(&pattern) {
                patterns.push(pattern);
            }
        }
        Ok(patterns)
    }

    /// Appends an entry to `web_accessible_resources`, creating the list when missing.
    pub(crate) fn add_web_accessible_resource(&mut self, entry: Value) -> Result<()> {
        let invalid = || {
            OutputError::Invalid(format!(
                "manifest key {WEB_ACCESSIBLE_RESOURCES_KEY} is not an array"
            ))
        };
        self.0
            .as_object_mut()
            .ok_or_else(invalid)?
            .entry(WEB_ACCESSIBLE_RESOURCES_KEY)
            .or_insert_with(|| Value::Array(Vec::new()))
            .as_array_mut()
            .ok_or_else(invalid)?
            .push(entry);
        Ok(())
    }
}

/// Whether `glob` (where `*` is any run of characters) matches the whole `text`.
fn glob_matches(glob: &str, text: &str) -> bool {
    let Some((head, tail)) = glob.split_once('*') else {
        return glob == text;
    };
    let Some(rest) = text.strip_prefix(head) else {
        return false;
    };
    rest.char_indices()
        .map(|(index, _)| index)
        .chain([rest.len()])
        .any(|index| glob_matches(tail, rest.get(index..).unwrap_or_default()))
}

fn is_host_matching(pattern_host: &str, host: &str) -> bool {
    let is_any_host = pattern_host == ANY_HOST;
    if is_any_host {
        return true;
    }
    let Some(domain) = pattern_host.strip_prefix(ANY_SUBDOMAIN_PREFIX) else {
        return pattern_host == host;
    };
    host == domain || host.ends_with(&format!(".{domain}"))
}

fn is_scheme_matching(pattern_scheme: &str, scheme: &str) -> bool {
    let is_any_web_scheme = pattern_scheme == "*";
    if is_any_web_scheme {
        return ANY_WEB_SCHEMES.contains(&scheme);
    }
    pattern_scheme == scheme
}

/// Splits `scheme://host/path` into its parts; the path keeps its leading slash.
fn split_url(text: &str) -> Option<(&str, &str, &str)> {
    let (scheme, rest) = text.split_once(SCHEME_SEPARATOR)?;
    let slash = rest.find('/')?;
    let (host, path) = rest.split_at_checked(slash)?;
    Some((scheme, host, path))
}

/// Chrome's match pattern semantics, as far as a tab URL needs them.
pub(crate) fn matches_url_pattern(url: &str, pattern: &str) -> bool {
    let is_every_url = pattern == ALL_URLS_PATTERN;
    if is_every_url {
        return true;
    }
    let Some((scheme, host, path)) = split_url(pattern) else {
        return false;
    };
    let Some((url_scheme, url_host, url_path)) = split_url(url) else {
        return false;
    };
    PATTERN_SCHEMES.contains(&scheme)
        && is_scheme_matching(scheme, url_scheme)
        && is_host_matching(host, url_host)
        && glob_matches(path, url_path)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use crate::output::manifest::*;

    #[test]
    fn subdomain_wildcard_matches_bare_and_nested_hosts() {
        let pattern = "*://*.youtube.com/*";
        for url in [
            "https://youtube.com/watch?v=1",
            "https://www.youtube.com/",
            "http://music.youtube.com/a",
        ] {
            assert!(matches_url_pattern(url, pattern), "{url}");
        }
        assert!(!matches_url_pattern("https://notyoutube.com/a", pattern));
        assert!(!matches_url_pattern("ftp://youtube.com/a", pattern));
    }

    #[test]
    fn paths_and_all_urls() {
        let embed = "https://www.youtube.com/embed/*";
        assert!(matches_url_pattern(
            "https://www.youtube.com/embed/x",
            embed
        ));
        assert!(!matches_url_pattern("https://www.youtube.com/watch", embed));
        assert!(matches_url_pattern("file:///tmp/a", ALL_URLS_PATTERN));
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
        assert_eq!(manifest.content_script_matches()?, ["*://x/*", "*://y/*"]);
        assert!(manifest.gecko_id().is_err());
        Ok(())
    }
}
