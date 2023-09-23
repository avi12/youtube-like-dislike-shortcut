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
    <img src="https://github.com/avi12/youtube-like-dislike-shortcut/assets/6422804/31f486bd-2273-4448-9b7b-5378cf220b48" alt="Screenshot">
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

<details>
<summary>If installing dependencies is throwing an error on Windows</summary>
Install C++ build tools<br>  
The easiest way is by installing <a href="https://visualstudio.microsoft.com/downloads">Visual Studio</a> and through the installer, selecting

![Desktop development with C++ under Workloads tab](https://user-images.githubusercontent.com/6422804/199964961-529c11cd-2891-4ca2-bd89-bb848fac8d58.png)

</details>

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

### Opera on Windows 10/11

```shell
pnpm run-opera-windows
```

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on" → select `dist/manifest.json`

## Build & pack

```shell
pnpm build-pack
```

## Contribution

Feel free to contribute! Keep in mind that the license I chose
is [GPL v3](https://github.com/avi12/youtube-like-dislike-shortcut/blob/main/LICENSE).  
If you want to fork, make sure to credit [avi12](https://avi12.com) and link to this repository.
