import "./popup.css";
import { mount } from "svelte";
import Popup from "./Popup.svelte";

const app = mount(Popup, {
  target: document.getElementById("app")!
});

export default app;
