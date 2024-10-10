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
- [Mozilla Firefox](https://addons.mozilla.org/addon/youtube-like-dislike-shortcut) 109+ ![Mozilla Add-on](https://img.shields.io/amo/users/youtube-like-dislike-shortcut?color=white&label=users&style=flat-square)
- [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/pdoiddhhpjkclobjlomfkgfldjoggfig) ![users count](https://img.shields.io/badge/dynamic/json?label=users&query=activeInstallCount&style=flat-square&color=white&url=https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/pdoiddhhpjkclobjlomfkgfldjoggfig)
- [Opera](https://addons.opera.com/en/extensions/details/youtube-like-dislike-shortcut)

Made by [Avi](https://avi12.com)

## Requirements for setting up

Install [Node.js](https://nodejs.org) and [PNPM](https://pnpm.io/installation)

## Install dependencies

```shell script
pnpm i
```

## Start the dev server & run in a test browser

### Chrome

```shell script
pnpm dev
```

### Edge

```shell
pnpm dev:edge
```

### Opera

```shell
pnpm dev:opera
```

### Firefox

Currently [unsupported](https://github.com/wxt-dev/wxt/issues/230#issuecomment-1806881653)  
Instead, after building you can follow [this guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox)

## Build

### Chrome

```shell script
pnpm build
```

### Edge

```shell script
pnpm build:edge
```

### Opera

```shell
pnpm build:opera
```

### Firefox

```shell
pnpm build:firefox
```

## Package

### Chrome

```shell
pnpm package
```

### Edge

```shell
pnpm package:edge
````

### Opera

```shell
pnpm package:opera
```

### Firefox

```shell
pnpm package:firefox
```

## Shorthands

### Chrome

```shell
pnpm build:package
```

### Edge

```shell
pnpm build:package:edge
```

### Opera

```shell
pnpm build:package:opera
```

### Firefox

```shell
pnpm build:package:firefox
```

## Contribution

Feel free to contribute! Keep in mind that the license I chose
is [GPL v3](https://github.com/avi12/youtube-like-dislike-shortcut/blob/main/LICENSE)  
If you want to fork, make sure to credit [Avi](https://avi12.com) and link to this repository.
