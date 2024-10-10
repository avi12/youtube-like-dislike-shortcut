import "./style.css";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  main: () => {}
});
