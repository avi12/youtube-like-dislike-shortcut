# YouTube Like-Dislike Shortcut

Basically copies the like/dislike shortcut from YouTube Music, which means:

- <kbd>Shift</kbd>+<kbd>Plus</kbd> (on the number row) to like a video
- <kbd>Shift</kbd>+<kbd>Minus</kbd> (on the number row) to dislike
- <kbd>Numpad Plus</kbd> to like
- <kbd>Numpad Minus</kbd> to dislike

Additionally:

- Auto-like videos based on a watch time threshold that you set OR based on whether you're subscribed to the channel
- <kbd>Shift</kbd>+<kbd>0</kbd> (on the number row) to remove your like/dislike
- Pressing the like/dislike shortcut while the corresponding button is active (i.e. pressed), will do nothing
- <details>
    <summary>Pop-up page with options</summary>
    <img src="https://github.com/avi12/youtube-like-dislike-shortcut/assets/6422804/4fd19d7c-cf26-433d-b34d-2104dabb881b" alt="Screenshot">
  </details>

**This extension does not reveal the videos' dislike counters**

Available for:

- [Google Chrome](https://chrome.google.com/webstore/detail/fdkpkpelkkdkjhpacficichkfifijipc) ![Chrome Web Store](https://img.shields.io/chrome-web-store/users/fdkpkpelkkdkjhpacficichkfifijipc?color=white&label=users&style=flat-square)
- [Mozilla Firefox](https://addons.mozilla.org/addon/youtube-like-dislike-shortcut)
  109+ ![Mozilla Add-on](https://img.shields.io/amo/users/youtube-like-dislike-shortcut?color=white&label=users&style=flat-square)
- [Opera](https://addons.opera.com/en/extensions/details/youtube-like-dislike-shortcut)

Made by [Avi](https://avi12.com)

## Claude Code

The repo includes `.mcp.json` with two MCP servers for browser automation:

- [chrome-devtools-mcp](https://npm.im/chrome-devtools-mcp) - connects to any Chromium-based browser via remote debugging on port 9225
- [firefox-devtools-mcp](https://npm.im/firefox-devtools-mcp) - connects to Firefox via Marionette on port 2828

## Requirements

Install [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io) 11+, then: `pnpm install`

## Dev

| Browser                | Command                         |
|------------------------|---------------------------------|
| Chrome                 | `pnpm dev`                      |
| Chrome (with profile)  | `pnpm dev:with-profile`         |
| Opera                  | `pnpm dev:opera`                |
| Opera (with profile)   | `pnpm dev:opera:with-profile`   |
| Firefox                | `pnpm dev:firefox`              |
| Firefox (with profile) | `pnpm dev:firefox:with-profile` |

## Build

| Browser | Command              |
|---------|----------------------|
| Chrome  | `pnpm build`         |
| Opera   | `pnpm build:opera`   |
| Firefox | `pnpm build:firefox` |

## Package

| Browser | Command                |
|---------|------------------------|
| Chrome  | `pnpm package`         |
| Opera   | `pnpm package:opera`   |
| Firefox | `pnpm package:firefox` |

## Build & Package

| Browser | Command                      |
|---------|------------------------------|
| Chrome  | `pnpm build:package`         |
| Opera   | `pnpm build:package:opera`   |
| Firefox | `pnpm build:package:firefox` |
| All     | `pnpm build:package:all`     |

## Contribution

Feel free to contribute! Keep in mind that the license I chose
is [GPL v3](https://github.com/avi12/youtube-like-dislike-shortcut/blob/main/LICENSE)  
If you want to fork, make sure to credit [Avi](https://avi12.com) and link to this repository
