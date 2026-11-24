// Task D4-2: product list measurements, used for docs/performance.md.
// How to use:
//   1. npm run build && npm run preview      (always measure the PRODUCTION build)
//   2. open http://localhost:4173/?sort=rating, open DevTools -> Console
//   3. paste this whole file, then run e.g.:   await measureList("/?perPage=all")
// Use a fresh page load and views not visited yet, otherwise RTK Query's cache answers instantly.
// It navigates inside the app (no reload) and reports what a shopper waits for.
async function measureList(path, { scroll = true } = {}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const go = (to) => {
    history.pushState({}, "", to);
    dispatchEvent(new PopStateEvent("popstate"));
  };
  const cards = () =>
    document.querySelectorAll(".product-grid .product-card, .product-grid-virtual .product-card")
      .length;
  const firstCard = () =>
    document
      .querySelector(".product-grid .product-card__link, .product-grid-virtual .product-card__link")
      ?.getAttribute("href");

  const longTasks = [];
  const taskObserver = new PerformanceObserver((list) => longTasks.push(...list.getEntries()));
  taskObserver.observe({ type: "longtask" });
  // Long Animation Frames split a slow frame into script vs style/layout time.
  const frames = [];
  const frameObserver = new PerformanceObserver((list) => frames.push(...list.getEntries()));
  frameObserver.observe({ type: "long-animation-frame" });

  // Ask the server first, so we know exactly what the finished view looks like.
  const params = new URLSearchParams(path.split("?")[1] ?? "");
  const perPage = params.get("perPage");
  const query = new URLSearchParams({
    sort: params.get("sort") ?? "relevance",
    page: "1",
    ...(params.get("inStock") ? { inStock: "true" } : {}),
    ...(perPage ? { pageSize: perPage === "all" ? "5000" : perPage } : {}),
  });
  const expected = await (await fetch(`/api/products?${query}`)).json();
  const firstId = `/products/${expected.items[0].id}`;
  const isVirtual = expected.items.length > 96;

  performance.clearResourceTimings();
  const t0 = performance.now();
  go(path);
  // Done = the expected first product is shown, and (plain list) ALL cards are in the page,
  // or (virtual list) the virtual grid is in the page. Checking only the first card is not
  // enough: two views can start with the same product.
  while (
    firstCard() !== firstId ||
    (!isVirtual && cards() !== expected.items.length) ||
    (isVirtual && !document.querySelector(".product-grid-virtual"))
  ) {
    await nextFrame();
  }
  await nextFrame();
  const shownAt = performance.now();
  await sleep(300); // observers deliver entries asynchronously
  longTasks.push(...taskObserver.takeRecords());
  frames.push(...frameObserver.takeRecords());

  const request = performance
    .getEntriesByType("resource")
    .filter((entry) => entry.name.includes("/api/products?"))
    .pop();
  const slowest = [...frames].sort((a, b) => b.duration - a.duration)[0];

  const result = {
    path,
    products: expected.items.length,
    cardsInPage: cards(),
    totalMs: Math.round(shownAt - t0),
    requestMs: request ? Math.round(request.responseEnd - request.startTime) : "cached",
    renderAfterResponseMs: request ? Math.round(shownAt - request.responseEnd) : "-",
    longestTaskMs: Math.round(Math.max(0, ...longTasks.map((task) => task.duration))),
    slowestFrame: slowest
      ? {
          ms: Math.round(slowest.duration),
          scriptMs: Math.round([...slowest.scripts].reduce((sum, s) => sum + s.duration, 0)),
          styleAndLayoutMs: Math.round(
            slowest.styleAndLayoutStart
              ? slowest.startTime + slowest.duration - slowest.styleAndLayoutStart
              : 0,
          ),
        }
      : "none over 50 ms",
    domElements: document.querySelectorAll("*").length,
  };

  if (scroll) {
    // Scroll down 400px per frame for 3 seconds and record how long each frame took.
    // Smooth = every frame about 16.7 ms (60 frames per second).
    const frameTimes = [];
    let last = performance.now();
    const end = last + 3000;
    while (performance.now() < end) {
      window.scrollBy(0, 400);
      await nextFrame();
      const now = performance.now();
      frameTimes.push(now - last);
      last = now;
    }
    frameTimes.sort((a, b) => a - b);
    const average = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    result.scrollFps = Math.round(1000 / average);
    result.scrollP95FrameMs = Math.round(frameTimes[Math.floor(frameTimes.length * 0.95)]);
    result.scrollFramesOver50ms = frameTimes.filter((time) => time > 50).length;
    window.scrollTo(0, 0);
  }

  taskObserver.disconnect();
  frameObserver.disconnect();
  return result;
}
