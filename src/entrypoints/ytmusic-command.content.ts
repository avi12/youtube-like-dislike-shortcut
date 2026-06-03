import { type MusicFocusMessage, type MusicRateMessage, PortName } from "@/lib/ytmusic-command";
import { rateVideo } from "@/lib/ytr-buttons";

let activePort: Browser.runtime.Port | null = null;

function handleRateMessage(message: MusicRateMessage) {
  void rateVideo(message.rate);
}

function sendFocusState() {
  if (!activePort) {
    return;
  }
  const message: MusicFocusMessage = { isFocused: document.hasFocus() };
  activePort.postMessage(message);
}

function handleDisconnect() {
  activePort = null;
  connect();
}

function connect() {
  activePort = browser.runtime.connect({ name: PortName.musicShortcut });
  activePort.onMessage.addListener(handleRateMessage);
  activePort.onDisconnect.addListener(handleDisconnect);
  sendFocusState();
}

export default defineContentScript({
  matches: ["https://music.youtube.com/*"],
  main() {
    connect();
    addEventListener("focus", sendFocusState);
    addEventListener("blur", sendFocusState);
    document.addEventListener("visibilitychange", sendFocusState);
  }
});
