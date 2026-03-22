self.addEventListener("install", (event) => {
  self.skipWaiting(); // немедленно активировать новый SW
  event.waitUntil(
    caches.open("kniga-znakov-cache-v2").then((cache) => {
      return cache.addAll([
        "./",
        "./index.html",
        "./icon-192.png",
        "./icon-512.png"
      ]);
    })
  );
});

self.addEventListener("activate", (event) => {
  // Удаляем старые кеши
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== "kniga-znakov-cache-v2") {
          return caches.delete(key);
        }
      }))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open("kniga-znakov-cache-v2").then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
