async ({ scripts, isInjecting }) => {
  const api = globalThis.browser ?? globalThis.chrome;
  const frames = [];
  for (const tab of await api.tabs.query({})) {
    if (tab.discarded) {
      continue;
    }

    const found = await api.webNavigation.getAllFrames({ tabId: tab.id }).catch(() => []);
    for (const frame of found ?? []) {
      frames.push({
        tabId: tab.id,
        frameId: frame.frameId,
        url: frame.url
      });
    }
  }

  const listFrames = script => {
    const patterns = script.urlPatterns.map(pattern => new RegExp(pattern));
    return frames.filter(frame => (script.isAllFrames || frame.frameId === 0) && patterns.some(pattern => pattern.test(frame.url)));
  };
  const toTarget = frame => ({
    tabId: frame.tabId,
    frameIds: [frame.frameId]
  });
  // A frame the browser froze or is still navigating may never answer, which must not hold up the rest
  const FRAME_TIMEOUT_MS = 5000;
  const within = (step, promise) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${step} did not answer`)), FRAME_TIMEOUT_MS))
  ]);
  const failures = [];
  const report = (frame, error) => failures.push(`${frame.url.slice(0, 120)}: ${error?.message ?? error}`);
  const matched = new Set(scripts.flatMap(listFrames));
  await Promise.all([...matched].flatMap(frame => ["ISOLATED", "MAIN"].map(world => within("teardown", api.scripting.executeScript({
    target: toTarget(frame),
    world,
    injectImmediately: true,
    func() {
      globalThis.devtoolRegistry?.teardown();
    }
  })).catch(error => report(frame, error)))));

  const updatedTabIds = new Set();
  const inject = async (script, frame) => {
    const target = toTarget(frame);
    if (script.styleSheets.length) {
      await within("removing styles", api.scripting.removeCSS({
        target,
        files: script.styleSheets
      })).catch(() => {});
      await within("inserting styles", api.scripting.insertCSS({
        target,
        files: script.styleSheets
      }));
    }

    await within("injecting", api.scripting.executeScript({
      target,
      files: script.files,
      world: script.world,
      injectImmediately: true
    }));
    updatedTabIds.add(frame.tabId);
  };
  // Manifest order within a frame, every frame at once
  await Promise.all([...matched].map(async frame => {
    for (const script of isInjecting ? scripts : []) {
      if (listFrames(script).includes(frame)) {
        await inject(script, frame).catch(error => report(frame, error));
      }
    }
  }));

  return {
    tabCount: updatedTabIds.size,
    frameCount: matched.size,
    failures
  };
}
