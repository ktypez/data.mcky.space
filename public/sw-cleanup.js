// sw-cleanup.js — imported by the generated workbox service worker.
// Evicts every cache written by the previous hand-rolled sw.js (ezzy-v2) so
// stale shells from the old SW cannot survive the upgrade.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => ['ezzy-v2', 'api-cache', 'r2-images'].includes(n)).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})
