
const CACHE_NAME = "student-hub-shell-v1";

self.addEventListener("install", (event) => {
  // Activate the new worker without caching private student data.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) =>
            name.startsWith("student-hub-shell-") &&
            name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// This initial version does not intercept requests or cache pages.
// That helps protect the existing app while we test installation.
