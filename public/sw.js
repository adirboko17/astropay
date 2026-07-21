/* Minimal service worker — enables desktop install; network-first for app routes. */
const CACHE_VERSION = "asrtopay-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(CACHE_VERSION).then((cache) => cache.match(event.request)),
    ),
  );
});
