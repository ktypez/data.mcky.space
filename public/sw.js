/* Service worker for data.mcky.space
 *
 * Purpose: simple offline-friendly caching of the app shell.
 * It does NOT auto-reload the page — that previously caused a refresh loop
 * when Cloudflare's SPA fallback returned HTML (text/html) for missing asset
 * hashes, which the SW mistook for "stale chunk". Asset requests go
 * network-first and only fall back to cache when offline.
 */

const VERSION = 'v2'
const APP_SHELL = ['/', '/index.html']
const ASSET_RE = /\/assets\/[^?]*\.(?:js|css)$/

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigation requests: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(VERSION)
          cache.put('/index.html', fresh.clone())
          return fresh
        } catch {
          return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error()
        }
      })(),
    )
    return
  }

  // Hashed JS/CSS assets: network-first (always fetch fresh so a new deploy
  // is picked up immediately), fall back to cache only when offline.
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok) {
            const cache = await caches.open(VERSION)
            cache.put(req, res.clone())
          }
          return res
        } catch {
          const cached = await caches.match(req, { ignoreSearch: true })
          return cached || Response.error()
        }
      })(),
    )
    return
  }

  // Everything else: pass through.
})
