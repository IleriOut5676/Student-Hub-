
const CACHE_NAME = "student-hub-shell-v2";

const APP_FILES = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.svg"
];

// Install: save the core app files for offline use.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_FILES);
      await self.skipWaiting();
    })
  );
});

// Activate: remove older Student Hub shell caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith("student-hub-shell-") &&
              name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// Fetch: serve saved app files when possible.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle normal GET requests from this website.
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  // For page navigation, use the saved app page if offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match("./index.html");
        return cachedPage || Response.error();
      })
    );
    return;
  }

  // For app resources, prefer the saved copy and use the
  // network when a resource has not been cached yet.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    })
  );
});
