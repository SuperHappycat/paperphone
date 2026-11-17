/* Paper Phone – keeps the Window app working without a connection.
 * Network first, so a new version always wins; the cache is only the fallback. */
const CACHE = "paperphone-window-1";
const FILES = ["window.html", "js/window.js", "js/keypad.js", "fonts/varela_regular.otf", "fonts/worksans_regular.ttf", "manifest.webmanifest", "window-icon-180.png"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || !FILES.some((f) => url.pathname.endsWith("/" + f))) return;
  e.respondWith(
    fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
