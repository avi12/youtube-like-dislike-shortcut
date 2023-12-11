# YouTube Like-Dislike Shortcut

Basically copies the like/dislike shortcut from YouTube Music, which means:

- Shift+Plus (on the number row) to like a video
- Shift+Minus (on the number row) to dislike
- Numpad Plus to like
- Numpad Minus to dislike

Additionally:

- Auto-like videos based on a watch time threshold that you set OR based on whether you're subscribed to the channel
- Shift+0 (on the number row) to remove your like/dislike
- Pressing the like/dislike shortcut while the corresponding button is active (i.e. pressed), will do nothing
- <details>
    <summary>Pop-up page with options</summary>
    <img src="https://github.com/avi12/youtube-like-dislike-shortcut/assets/6422804/4fd19d7c-cf26-433d-b34d-2104dabb881b" alt="Screenshot">
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

## Start dev server

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

### Opera on Windows 10/11

```shell
pnpm run-opera-windows
```

### Firefox

```shell
pnpm run-firefox
```
## Build & pack

```shell
pnpm build-pack
```

## Contribution

Feel free to contribute! Keep in mind that the license I chose
is [GPL v3](https://github.com/avi12/youtube-like-dislike-shortcut/blob/main/LICENSE).  
If you want to fork, make sure to credit [avi12](https://avi12.com) and link to this repository.
