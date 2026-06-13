/* ── Life Tracker Service Worker ──────────────── */

const CACHE_NAME = 'lifetrack-v2';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/js/main.js',
  '/manifest.json',
];

/* Install — cache core assets */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can; ignore failures for external resources
      return Promise.allSettled(
        CACHE_URLS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

/* Activate — clean old caches */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch — cache-first for same-origin, network-first for external */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and browser extension requests
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses from same origin
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});