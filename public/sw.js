/* DATA Ledger shell worker.
   - Network-first: the app never lives off a stale cached shell.
   - Cache is a fallback for offline only; every navigation revalidates.
   - Bump CACHE when the shell changes; activate() deletes every other cache
     (including old workbox caches from the previous app). */
const CACHE = 'data-ledger-shell-v2';

self.addEventListener('install', (event) => {
  // Do NOT skipWaiting here: the UI shows an update modal first, then asks us.
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts / map tiles / Clerk CDN / R2
  event.respondWith(networkFirst(req, req.mode === 'navigate'));
});

async function networkFirst(req, isNav) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req) || (isNav ? await cache.match('/index.html') : null);
    if (hit) return hit;
    throw err;
  }
}
