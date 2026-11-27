// The dev-only teardown registry, prepended by the dev server to every built content script. It
// records what a script leaves behind in a page - listeners, observers, timers and WXT's mounted UI -
// so the dev server can undo a running build and run the new one in the same tab.
//
//  - isolated world: everything the world registers is the extension's, so all of it is tracked
//  - page (MAIN) world: only registrations whose call stack goes through an extension file are
//    tracked, since the page registers through the same functions
//
// `begin(name)` also stops a script from running twice in one world (Firefox re-runs declared content
// scripts when an add-on reloads, next to the dev server's own injection).
(() => {
  if (globalThis.devtoolRegistry) {
    return;
  }

  const TEARDOWN_EVENT = "devtool:teardown";
  const extensionApi = globalThis.browser ?? globalThis.chrome;
  const extensionId = extensionApi?.runtime?.id;
  const isIsolated = Boolean(extensionId);
  const worldId = `${Date.now()}-${Math.random()}`;
  /** @type {Set<() => void>} */
  const undoSteps = new Set();
  /** @type {Set<string>} */
  const running = new Set();
  let isRetired = false;

  function isOwnCall() {
    return isIsolated || /-extension:\/\//.test(new Error().stack ?? "");
  }

  /** @param {() => void} undo */
  function track(undo) {
    undoSteps.add(undo);
  }

  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function addEventListener(type, listener, options) {
    if (!isOwnCall()) {
      return add.call(this, type, listener, options);
    }

    if (isRetired) {
      return undefined;
    }

    const target = this ?? globalThis;
    add.call(target, type, listener, options);
    track(() => remove.call(target, type, listener, options));
    return undefined;
  };

  for (const name of ["MutationObserver", "ResizeObserver", "IntersectionObserver"]) {
    const prototype = globalThis[name]?.prototype;
    if (!prototype) {
      continue;
    }

    const { observe } = prototype;
    prototype.observe = function trackedObserve(...parameters) {
      if (!isOwnCall()) {
        return observe.apply(this, parameters);
      }

      if (isRetired) {
        return undefined;
      }

      observe.apply(this, parameters);
      track(() => this.disconnect());
      return undefined;
    };
  }

  const timers = [
    ["setTimeout", "clearTimeout"],
    ["setInterval", "clearInterval"],
    ["requestAnimationFrame", "cancelAnimationFrame"]
  ];
  for (const [startName, stopName] of timers) {
    const start = globalThis[startName].bind(globalThis);
    const stop = globalThis[stopName].bind(globalThis);
    globalThis[startName] = (...parameters) => {
      if (!isOwnCall()) {
        return start(...parameters);
      }

      if (isRetired) {
        return 0;
      }

      const id = start(...parameters);
      track(() => stop(id));
      return id;
    };
  }

  // WXT's content script context invalidates itself, unmounting its UI, when a newer copy of the same
  // script announces itself. The detail of that event does not cross worlds, so the running world
  // announces to itself.
  function invalidateContexts() {
    for (const name of running) {
      if (!extensionId) {
        return;
      }

      document.dispatchEvent(new CustomEvent(`${extensionId}:${name}:wxt:content-script-started`, {
        detail: {
          contentScriptName: name,
          messageId: TEARDOWN_EVENT
        }
      }));
    }
  }

  function teardown() {
    invalidateContexts();
    for (const undo of undoSteps) {
      try {
        undo();
      } catch (error) {
        console.debug("[devtool] a teardown step failed", error);
      }
    }

    undoSteps.clear();
    running.clear();
  }

  if (isIsolated) {
    // A new isolated world retires every older one: the extension reload orphaned them
    document.dispatchEvent(new CustomEvent(TEARDOWN_EVENT, { detail: worldId }));
    add.call(document, TEARDOWN_EVENT, e => {
      if (e.detail === worldId || isRetired) {
        return;
      }

      teardown();
      isRetired = true;
    });
  }

  globalThis.devtoolRegistry = {
    /** @param {string} name */
    begin(name) {
      const isRunning = running.has(name);
      running.add(name);
      return !isRunning;
    },
    teardown
  };
})();
