const CACHE_NAME = "sidaaman-enweq-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // ============================================
  // IMPORTANT:
  // NEVER CACHE SUPABASE API REQUESTS
  // ============================================
  if (
    url.hostname.endsWith(".supabase.co") ||
    url.hostname === "supabase.co"
  ) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If offline, do not return stale Supabase data.
          return new Response(
            JSON.stringify({
              error: "Offline",
              message: "Supabase data is unavailable offline."
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        })
    );

    return;
  }

  // ============================================
  // ONLY CACHE STATIC APP FILES
  // ============================================

  const isStaticFile =
    url.origin === self.location.origin &&
    (
      url.pathname.endsWith(".html") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".json") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".jpeg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.endsWith(".woff") ||
      url.pathname.endsWith(".woff2")
    );

  if (!isStaticFile) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {

      const networkResponse = fetch(request)
        .then(response => {

          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, copy);
              });
          }

          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    })
  );
});
