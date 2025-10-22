const CACHE_NAME = 'lw-static-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
  // Note: CRA will serve hashed assets; we rely on network-first for them,
  // and basic offline shell for index.html.
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Do NOT intercept or cache cross-origin calls or calls to likely backend ports (e.g., :3001).
// - For same-origin navigation and static files, try network first, fallback to cache, then to offline shell.
// - Respect "no-store" requests by bypassing cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Bypass for requests with no-store/no-cache directives to avoid blocking backend version/status calls
  const cacheControl = req.headers.get('Cache-Control') || '';
  if (/no-store|no-cache/i.test(cacheControl)) {
    return; // allow default browser fetch
  }

  // Never handle cross-origin requests (like backend http(s)://host:3001)
  if (!isSameOrigin) {
    return;
  }

  // If request appears to be to a backend port on same host (e.g., proxy scenarios), bypass
  if (url.port && url.port !== self.location.port) {
    return;
  }

  // Navigation requests: network-first, fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/index.html').then((res) => res || Response.error())
      )
    );
    return;
  }

  // Static assets: network-first, then cache fallback
  if (req.method === 'GET') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || Response.error()))
    );
  }
});
