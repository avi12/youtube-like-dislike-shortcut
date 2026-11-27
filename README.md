# YouTube Like-Dislike Shortcut

Like, dislike and un-rate from the keyboard, on both **YouTube** and **YouTube Music**

<img src="assets/popup.png" width="824" height="615" alt="The extension's popup. Shortcuts: Shift + Equal or NumpadAdd to like, Shift + Minus or NumpadSubtract to dislike, Shift + 0 to un-rate, each with a reset button. Auto-like videos: after watching a chosen percentage (60% here), in subscribed channels, and separate switches for YouTube, YouTube Shorts and YouTube Music. Auto, light and dark themes">

**This extension does not reveal the videos' dislike counters**

## Install

![Chrome Web Store users](https://badgen.net/chrome-web-store/users/fdkpkpelkkdkjhpacficichkfifijipc?label=Chrome%20Web%20Store%20users&icon=chrome)\
![Firefox Add-ons users](https://img.shields.io/amo/users/youtube-like-dislike-shortcut?color=white&label=Firefox%20Add-ons%20users&style=flat-square&logo=firefoxbrowser)\
![Opera Add-ons users](https://img.shields.io/badge/dynamic/regex?url=https%3A%2F%2Faddons.opera.com%2Fen%2Fextensions%2Fdetails%2Fyoutube-like-dislike-shortcut%2F&search=Downloads%3C%2Fdt%3E%3Cdd%3E%28%5B0-9%2C%5D%2B%29%3C%2Fdd%3E&replace=%241&color=white&label=Opera%20Add-ons%20users&style=flat-square&logo=opera&logoColor=FF1B2D)

## Good to know

- Pressing a like or dislike shortcut while that button is already active does nothing
- Auto-like by subscription also covers artists in your YouTube Music library
- The watched percentage is shown next to the like button while auto-like is active
- YouTube Music has global shortcuts too, to like, dislike or un-rate the playing song from any tab
  or window. Set them in `chrome://extensions/shortcuts` (there are no defaults). They work when there
  is a single YouTube Music tab and it isn't focused; in the focused tab, use the popup's shortcuts

## Development

### Setup

Install [Node.js](https://nodejs.org), [Bun](https://bun.com) 1.4.5 and, for the dev server,
[Rust](https://rustup.rs), then run `bun install`

### Dev server

| Browser                | Command                            |
| ---------------------- | ---------------------------------- |
| Edge (default)         | `bun run dev`                      |
| Edge (with profile)    | `bun run dev:edge:with-profile`    |
| Chrome                 | `bun run dev:chrome`               |
| Chrome (with profile)  | `bun run dev:with-profile`         |
| Opera                  | `bun run dev:opera`                |
| Opera (with profile)   | `bun run dev:opera:with-profile`   |
| Firefox                | `bun run dev:firefox`              |
| Firefox (with profile) | `bun run dev:firefox:with-profile` |
| Edge, in Hebrew        | `bun run dev:rtl`                  |

It builds the extension (production mode, into `build/<browser>-mv3-prod`), launches the browser with it
sideloaded, and rebuilds whenever `src/`, `wxt.config.ts`, `package.json`, `bun.lock` or an env file
changes. YouTube tabs stay open and are never reloaded:

| What changed                                         | What happens                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| A Svelte component or the popup's stylesheet         | It is swapped in place                                                         |
| Something only the popup loads that can't be swapped | The open popup pages reload                                                    |
| Anything else, such as a script or the manifest      | The extension reloads and the new content scripts replace the old ones in tabs |
| A build error                                        | The browser keeps the last good build until the next save                      |

An extension reload closes the extension's own pages, such as an open popup tab, and the replaced
content scripts start with fresh state

#### Browsers and profiles

- Chrome runs as Chrome for Testing, downloaded into `.chrome-for-testing/` on first use, since branded
  Chrome no longer sideloads from the command line
- Profiles live beside the repository, in `../youtube-like-dislike-shortcut-profiles/`. By default a
  temporary one starts empty on every run; "with profile" keeps one, seeded from your own browser's
  bookmarks (Firefox: session files)
- The remote debugging port is 9225 (Firefox: Marionette on 2828). `bun run dev --help` lists the options

#### How it works

The dev server is two Rust crates, adapted from
[youtube-downloader](https://github.com/avi12/youtube-downloader):

- [dev-server](dev-server) - file watching, rebuild decisions and the debugging protocols
- [tools](tools) - the `devtool` binary: builds, hot swapping and browsers

Builds are written to `build/.staging` and then synced into the loaded directory, so it is never empty
or partial. Editor scratch files (`*.tmp.*`, `*~`, swap files) never start a build. To undo a running
content script, a registry prepended to the built scripts records its listeners, observers and timers.
That registry and the `scripting` and `webNavigation` permissions exist in dev builds only

Test the crates with `bun run dev-server:test` and `bun run tools:test`

### Build

| Browser | Command                 |
| ------- | ----------------------- |
| Chrome  | `bun run build`         |
| Opera   | `bun run build:opera`   |
| Firefox | `bun run build:firefox` |

### Package

Packaging builds first, so there is no separate build step to run

| Browser | Command                   |
| ------- | ------------------------- |
| Chrome  | `bun run package`         |
| Opera   | `bun run package:opera`   |
| Firefox | `bun run package:firefox` |
| All     | `bun run package:all`     |

`bun run crx` packages Chrome and signs it into a `.crx` for GitHub releases. The signing key is created
in the gitignored `keys/` folder on the first run - keep it, since it fixes the extension ID

### Claude Code

The repo includes `.mcp.json` with two MCP servers for browser automation:

- [chrome-devtools-mcp](https://npm.im/chrome-devtools-mcp) - connects to any Chromium-based browser via remote debugging on port 9225
- [firefox-devtools-mcp](https://npm.im/firefox-devtools-mcp) - connects to Firefox via Marionette on port 2828

## Contribution

Feel free to contribute! Keep in mind that the license I chose
is [GPL v3](https://github.com/avi12/youtube-like-dislike-shortcut/blob/main/LICENSE)  
If you want to fork, make sure to credit [Avi](https://avi12.com) and link to this repository

Made by [Avi](https://avi12.com)
