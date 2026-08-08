// Minimal PWA service worker for the SmileCare staff dashboard.
// Scope: cache the static app shell (HTML/JS/CSS) only, so the app can
// launch from a home-screen icon even on a bad connection. Deliberately
// does NOT cache or intercept Supabase API/realtime calls — those must
// always hit the network so staff never act on stale patient data.

const CACHE_NAME = "smilecare-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests for the app shell. Anything else
  // (Supabase REST/realtime, WhatsApp webhooks, cross-origin, non-GET)
  // passes straight through to the network untouched.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // offline fallback to last-cached shell
      return cached || networkFetch;
    })
  );
});
