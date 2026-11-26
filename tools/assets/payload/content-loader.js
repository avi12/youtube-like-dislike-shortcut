// Replaces a hot content script: it runs the HMR build of the same entry, whose components can then
// swap in place. The dev server fills the literals.
(async () => {
  const api = globalThis.browser ?? globalThis.chrome;
  await import(api.runtime.getURL("@@RUNTIME_PATH@@"));
  const response = await fetch(api.runtime.getURL("@@MANIFEST_PATH@@"), { cache: "no-store" });
  const manifest = await response.json();
  const entry = await import(api.runtime.getURL(manifest.entries["@@ENTRY@@"].url));
  await entry.run();
})();
