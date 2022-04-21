# YouTube Like-Dislike Shortcut

Basically copies the like/dislike shortcut from YouTube Music, which means:

- Shift+Plus (on the number row) to like a video
- Shift+Minus (on the number row) to dislike
- Numpad Plus to like
- Numpad Minus to dislike

Additionally:

- Shift+0 (on the number row) to remove your like/dislike
- Pressing the like/dislike shortcut while the corresponding button is active (i.e. pressed), will do nothing
- <details>
    <summary>Customize the shortcuts</summary>
    <img src="https://user-images.githubusercontent.com/6422804/164332809-95ffc73c-aca1-4b3e-be0c-c2982413b3e4.png" alt="Screenshot">
  </details>

**This extension does not reveal the videos' dislike counters.**

<p>&nbsp;</p>

Available for:

- [Google Chrome](https://chrome.google.com/webstore/detail/fdkpkpelkkdkjhpacficichkfifijipc) ![Chrome Web Store](https://img.shields.io/chrome-web-store/users/fdkpkpelkkdkjhpacficichkfifijipc?color=white&label=users&style=flat-square)
- [Mozilla Firefox](https://addons.mozilla.org/addon/youtube-like-dislike-shortcut) ![Mozilla Add-on](https://img.shields.io/amo/users/youtube-like-dislike-shortcut?color=white&label=users&style=flat-square)
- [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/pdoiddhhpjkclobjlomfkgfldjoggfig) ![users count](https://img.shields.io/badge/dynamic/json?label=users&query=activeInstallCount&style=flat-square&color=white&url=https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/pdoiddhhpjkclobjlomfkgfldjoggfig)
- [Opera](https://addons.opera.com/en/extensions/details/youtube-like-dislike-shortcut)

Made by [avi12](https://avi12.com).

## Requirements for setting up

Install [Node.js](https://nodejs.org) and [PNPM](https://pnpm.js.org/en/installation).

## Install dependencies

```shell script
pnpm i
```

## Start Rollup for development

```shell script
pnpm dev
```

## Running

### Chromium/Chrome

```shell script
pnpm run-chromium
```

### Edge on Windows 10/11

```shell
pnpm run-edge-windows
```

### Browsers that don't support Manifest v3

1. Build the extension for Firefox/Opera (see below).
2. Open the extensions page in that browser.
3. Enable the developer mode (top-right corner usually).
4. Either drag-drop the browser-compatible ZIP onto the browser or click "Load unpacked extension" and choose it.

## Build & pack

```shell
pnpm build-pack
```

### Build for Firefox (first run `pnpm build-pack`)

```shell
pnpm build-for-firefox
```

### Build for Opera (first run `pnpm build-pack`)

```shell
pnpm build-for-opera
```

## Do you want to contribute?

Feel free to! Make sure to comply with the license, [GPL v3](https://github.com/avi12/skillshare-player-control/blob/main/LICENSE).
