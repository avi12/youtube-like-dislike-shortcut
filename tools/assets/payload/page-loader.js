// Replaces a hot page's script: the runtime styles the page, then the HMR build of its entry runs.
// The dev server fills the literals.
await import("@@RUNTIME_PATH@@");
await globalThis.devHmr.hostPage("@@ENTRY@@");
await import("@@ENTRY_PATH@@");
