// The in-page half of the dev HMR. Loaded as an ES module by the dev loaders in extension pages and
// in the frames a hot content script runs in, on Chromium and Firefox alike - it only needs `fetch`
// and dynamic `import` of the extension's own files.
//
//  - installs globalThis.devHmr.createHotContext, which the HMR-compiled `.svelte` modules call as
//    their `import.meta.hot`; Svelte registers one accept callback per component there
//  - polls the HMR manifest the dev server rewrites after every HMR build (a fetch of an extension
//    file works in both browsers; Chrome 147+ blocks a public page's connection to loopback, so no
//    socket is used) and re-imports every component whose version moved, then runs its accept
//    callback
//  - swaps a page's global stylesheets in place
//  - when a swap can't be applied (a re-import failed, a callback threw, a page's dependency graph
//    was re-split) an extension page reloads itself; a content script keeps running what it has
//  - keeps component and module `$state` across a swap (the registry under `state`)
//
// What a content script runs outside its components is never swapped here: the dev server reloads
// the extension and the tab for that.
//
// HMR_CONFIG is prepended by the dev server from the serde struct PayloadConfig.

/** @typedef {{ url: string, vendorHash: string, styles: string[], stylesHash: string }} ManifestEntry */
/** @typedef {{ entries: Record<string, ManifestEntry>, modules: Record<string, string> }} HmrManifest */
/** @typedef {(module: unknown) => void} AcceptCallback */

const LOG_PREFIX = "[dev HMR]";
const STYLE_ELEMENT_ID = "dev-hmr-styles";

function getExtensionApi() {
  const api = globalThis.browser ?? globalThis.chrome;
  if (!api) {
    throw new Error(`${LOG_PREFIX} no extension API in this context`);
  }

  return api;
}

const extensionApi = getExtensionApi();

/** @type {Map<string, AcceptCallback>} */
const acceptCallbacks = new Map();
/** @type {string | undefined} */
let hostedPage;

function noop() {}

/** A module's path inside the extension, which is how the manifest names it.
 * @param {string} url */
function toModulePath(url) {
  return new URL(url).pathname.slice(1);
}

/** @param {string} moduleUrl */
function createHotContext(moduleUrl) {
  const modulePath = toModulePath(moduleUrl);
  return {
    /** @param {AcceptCallback} callback */
    accept(callback) {
      acceptCallbacks.set(modulePath, callback);
    },
    /** @param {unknown} _exports @param {AcceptCallback} [callback] */
    acceptExports(_exports, callback) {
      if (callback) {
        acceptCallbacks.set(modulePath, callback);
      }
    },
    dispose: noop,
    prune: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
    data: {}
  };
}

// The $state registry the build-time rewrites call: a recreated component re-reads its primitives, a
// re-imported module adopts its first store
/** @type {Map<string, unknown>} */
const savedValues = new Map();
/** @type {Map<string, unknown>} */
const moduleStates = new Map();
/** @type {Map<string, number>} */
const liveInstanceCounts = new Map();
let isHotSwapApplying = false;

// Only primitives and functions are carried over; an object (a DOM ref, a component instance) would
// be a stale reference in the recreated component, so it starts fresh
/** @param {unknown} value */
function isPreservableValue(value) {
  return value === null || typeof value !== "object";
}

/** @param {string} componentId */
function forgetSavedValues(componentId) {
  for (const key of savedValues.keys()) {
    if (key.startsWith(`${componentId}:`)) {
      savedValues.delete(key);
    }
  }
}

const state = {
  // How many OTHER instances were live when this one started: only a singleton is restored, so list
  // rows never share a key
  /** @param {string} componentId */
  enter(componentId) {
    const others = liveInstanceCounts.get(componentId) ?? 0;
    liveInstanceCounts.set(componentId, others + 1);
    return others;
  },
  /** @param {string} componentId */
  exit(componentId) {
    const remaining = (liveInstanceCounts.get(componentId) ?? 1) - 1;
    if (remaining > 0) {
      liveInstanceCounts.set(componentId, remaining);
      return;
    }

    liveInstanceCounts.delete(componentId);

    if (!isHotSwapApplying) {
      forgetSavedValues(componentId);
    }
  },
  /** @param {string} key @param {number} otherLiveInstances @param {unknown} initial */
  restore(key, otherLiveInstances, initial) {
    const isRestorable = otherLiveInstances === 0 && savedValues.has(key);
    return isRestorable ? savedValues.get(key) : initial;
  },
  /** @param {string} key @param {unknown} value */
  save(key, value) {
    if (!isPreservableValue(value)) {
      savedValues.delete(key);
      return;
    }

    savedValues.set(key, value);
  },
  // Svelte returns an existing proxy from $state() unchanged, so handing back the first one keeps the
  // store's data while the module's $derived recompute with the new code
  /** @param {string} key @param {() => unknown} createInitial */
  adoptModuleState(key, createInitial) {
    return moduleStates.has(key) ? moduleStates.get(key) : createInitial();
  },
  /** @param {string} key @param {unknown} value */
  rememberModuleState(key, value) {
    if (!moduleStates.has(key)) {
      moduleStates.set(key, value);
    }
  }
};

// Svelte flushes a swap's recreations in a microtask, so all of them have run by the second frame
function holdStateThroughHotSwap() {
  isHotSwapApplying = true;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    isHotSwapApplying = false;
  }));
}

/** @param {string} path */
async function fetchExtensionFile(path) {
  return fetch(`${extensionApi.runtime.getURL(path)}?t=${Date.now()}`, { cache: "no-store" });
}

/** @returns {Promise<HmrManifest | undefined>} */
async function fetchManifest() {
  const response = await fetchExtensionFile(HMR_CONFIG.manifestPath);
  if (!response.ok) {
    return undefined;
  }

  return response.json();
}

/** The global stylesheets of a page, applied in place of the ones its build linked.
 * @param {ManifestEntry} entry */
async function applyStyles({ styles }) {
  const texts = await Promise.all(
    styles.map(async path => {
      const response = await fetchExtensionFile(path);
      return response.text();
    })
  );
  const element = document.getElementById(STYLE_ELEMENT_ID) ?? document.createElement("style");
  element.id = STYLE_ELEMENT_ID;
  element.textContent = texts.join("\n");
  document.head.prepend(element);
}

/** Called by a page's loader before it imports the page, so it is styled from the start.
 * @param {string} name */
async function hostPage(name) {
  hostedPage = name;
  const manifest = await fetchManifest();
  const entry = manifest?.entries[name];
  if (entry) {
    await applyStyles(entry);
  }
}

globalThis.devHmr = {
  createHotContext,
  hostPage,
  state
};

// Only an extension page reloads itself. A tab never does: like Vite after a failed fetch, a content
// script keeps what it runs until the next save applies
/** @param {string} reason */
function reloadPage(reason) {
  if (!hostedPage) {
    console.warn(`${LOG_PREFIX} not applied, the running code stays until the next save: ${reason}`);
    return;
  }

  console.info(`${LOG_PREFIX} reloading the page: ${reason}`);
  location.reload();
}

// A component never imported yet has no accept callback: it loads the current code when first used
/** @param {{ changed: string[], manifest: HmrManifest }} options */
async function swapComponents({ changed, manifest }) {
  for (const path of changed) {
    const callback = acceptCallbacks.get(path);
    if (!callback) {
      continue;
    }

    try {
      const module = await import(`${extensionApi.runtime.getURL(path)}?v=${manifest.modules[path]}`);
      holdStateThroughHotSwap();
      callback(module);
      console.info(`${LOG_PREFIX} swapped ${path}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} swapping ${path} failed`, error);
      reloadPage(`swapping ${path} failed`);
      return;
    }
  }
}

/** @param {{ previous: HmrManifest, next: HmrManifest }} options */
async function applyHotUpdates({ previous, next }) {
  const before = hostedPage ? previous.entries[hostedPage] : undefined;
  const after = hostedPage ? next.entries[hostedPage] : undefined;
  if (before && after) {
    if (before.vendorHash !== after.vendorHash) {
      reloadPage("the dependency graph changed");
      return;
    }

    if (before.stylesHash !== after.stylesHash) {
      await applyStyles(after);
    }
  }

  const changed = Object.keys(next.modules).filter(path => previous.modules[path] !== next.modules[path]);
  await swapComponents({
    changed,
    manifest: next
  });
}

/** @param {number} milliseconds */
async function pause(milliseconds) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

function isExtensionAlive() {
  return Boolean(extensionApi.runtime?.id);
}

async function pollManifest() {
  let current = await fetchManifest().catch(() => undefined);
  while (isExtensionAlive()) {
    await pause(HMR_CONFIG.pollIntervalMs);
    // A build in progress has no manifest, or half of one: the next poll reads the finished one
    const next = await fetchManifest().catch(() => undefined);
    if (!next || !current) {
      current ??= next;
      continue;
    }

    if (JSON.stringify(next) === JSON.stringify(current)) {
      continue;
    }

    const previous = current;
    current = next;
    await applyHotUpdates({
      previous,
      next
    }).catch(error => console.error(`${LOG_PREFIX} update failed`, error));
  }
}

pollManifest().catch(error => console.error(`${LOG_PREFIX} polling stopped`, error));
