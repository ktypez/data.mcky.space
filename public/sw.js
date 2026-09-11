const CACHE = 'ezzy-v2'
const SHELL = ['/', '/index.html']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (new URL(e.request.url).origin !== self.location.origin) return

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && /\/assets\//.test(new URL(e.request.url).pathname)) {
          caches.open(CACHE).then((c) => c.put(e.request, r.clone()))
        }
        return r
      })
      .catch(() => caches.match(e.request).then((r) => r || new Response('Offline', { status: 503 }))),
  )
})
