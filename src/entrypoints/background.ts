import {
  isMusicCommand,
  type MusicFocusMessage,
  type MusicRateMessage,
  PortName,
  rateForMusicCommand
} from "@/lib/ytmusic-command";

export default defineBackground(() => {
  const musicPortFocus = new Map<Browser.runtime.Port, boolean>();

  function findSingleBackgroundedPort() {
    let backgroundedPort: Browser.runtime.Port | null = null;
    for (const [port, isFocused] of musicPortFocus) {
      if (isFocused) {
        continue;
      }
      if (backgroundedPort) {
        return null;
      }
      backgroundedPort = port;
    }
    return backgroundedPort;
  }

  browser.runtime.onConnect.addListener(port => {
    if (port.name !== PortName.musicShortcut) {
      return;
    }
    musicPortFocus.set(port, false);

    function handleFocusUpdate(message: MusicFocusMessage) {
      musicPortFocus.set(port, message.isFocused);
    }

    port.onMessage.addListener(handleFocusUpdate);
    port.onDisconnect.addListener(() => {
      musicPortFocus.delete(port);
    });
  });

  browser.commands.onCommand.addListener(command => {
    if (!isMusicCommand(command)) {
      return;
    }
    const backgroundedPort = findSingleBackgroundedPort();
    if (!backgroundedPort) {
      return;
    }
    const message: MusicRateMessage = { rate: rateForMusicCommand[command] };
    backgroundedPort.postMessage(message);
  });
});
