# YouTube Like-Dislike Shortcut
Basically copies the like/dislike shortcut from YouTube Music, which means:  
* Shift+Plus (on the number row) to like a video
* Shift+Minus (on the number row) to dislike
* Numpad Plus to like
* Numpad Minus to dislike

Additionally:
* Shift+0 (on the number row) to remove your like/dislike
* Pressing the like/dislike shortcut while the corresponding button is active (i.e. pressed), will do nothing

Available for:
- [Google Chrome](https://chrome.google.com/webstore/detail/fdkpkpelkkdkjhpacficichkfifijipc) ![Chrome Web Store](https://img.shields.io/chrome-web-store/users/fdkpkpelkkdkjhpacficichkfifijipc?color=white&label=users&style=flat-square)
- [Mozilla Firefox](https://addons.mozilla.org/addon/youtube-like-dislike-shortcut) ![Mozilla Add-on](https://img.shields.io/amo/users/youtube-like-dislike-shortcut?color=white&label=users&style=flat-square)
- [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/pdoiddhhpjkclobjlomfkgfldjoggfig) ![users count](https://img.shields.io/badge/dynamic/json?label=users&query=activeInstallCount&style=flat-square&color=white&url=https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/pdoiddhhpjkclobjlomfkgfldjoggfig)
- [Opera](https://addons.opera.com/en/extensions/details/youtube-like-dislike-shortcut)

Made by [avi12](https://avi12.com).

## Requirements for setting up
Install [Node.js](https://nodejs.org) and [PNPM](https://pnpm.js.org/en/installation).

## Download dev dependencies:
```shell script
pnpm i
```
## Start Rollup for development
```shell script
pnpm dev
````
## Running
### Chromium/Chrome
```shell script
pnpm run-chromium
```
### Firefox
```shell script
pnpm run-firefox
```
### Other browsers
1. Open the extensions page in your browser.
1. Enable the developer tools (top-right corner usually).
1. Either drag-drop the `dist` folder onto the browser or click "Load unpacked extension" and choose it.

## Contribution
Feel free to contribute! Keep in mind that the license I chose is [GPL v3](/LICENSE).  
If you want to fork, make sure to credit [avi12](https://avi12.com) and link to [this repository](https://github.com/avi12/youtube-like-dislike-shortcut).