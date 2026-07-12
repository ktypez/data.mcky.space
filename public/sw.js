/* Self-healing service worker for data.mcky.space
 *
 * Goals:
 *  - Cache the app shell (index.html + entry bundle) for offline/fast loads.
 *  - Detect stale hashed-asset chunks (Vite fingerprinted *.js in /assets).
 *    After a new deploy, an old cached entry bundle may import a chunk hash
 *    that no longer exists on the server, producing
 *    "Failed to fetch dynamically imported module". When that happens we
 *    force the client to hard-reload so it picks up the fresh entry bundle.
 */

const APP_SHELL = ['/', '/index.html']
const ASSET_RE = /\/assets\/[^?]*\.(?:js|css)$/
const VERSION = 'v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => undefined),
    ),
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
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Only handle same-origin GETs.
  event.respondWith(handle(req, url))
})

async function handle(req, url) {
  // App shell (navigation) — network-first, fall back to cached shell.
  if (req.mode === 'navigate') {
    try {
      const fresh = await fetch(req)
      const cache = await caches.open(VERSION)
      cache.put('/index.html', fresh.clone())
      return fresh
    } catch {
      const cached = await caches.match('/index.html')
      if (cached) return cached
      return caches.match('/') || Response.error()
    }
  }

  // Hashed JS/CSS assets — cache-first, but verify integrity.
  if (ASSET_RE.test(url.pathname)) {
    const cached = await caches.match(req, { ignoreSearch: true })
    if (cached) {
      // Revalidate in the background; serve cache immediately.
      revalidate(req)
      // If the cached copy is missing (e.g. evicted), fall through to network below.
      const ok = await isUsableJs(cached)
      if (ok) return cached
    }

    try {
      const res = await fetch(req)
      if (res.ok && (res.headers.get('content-type') || '').includes('javascript')) {
        const cache = await caches.open(VERSION)
        cache.put(req, res.clone())
        return res
      }
      // Server returned something that isn't JS (SPA fallback HTML on 404 for
      // a dead chunk) — the old entry bundle is referencing a removed hash.
      if (!res.ok || !(res.headers.get('content-type') || '').includes('javascript')) {
        triggerHeal()
      }
      return res
    } catch {
      // Network failure while fetching a missing chunk → heal.
      triggerHeal()
      return cached || Response.error()
    }
  }

  // Everything else — plain network with cache fallback.
  try {
    return await fetch(req)
  } catch {
    return (await caches.match(req)) || Response.error()
  }
}

// Background revalidation without blocking the response.
function revalidate(req) {
  fetch(req)
    .then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()))
    })
    .catch(() => {})
}

// A cached JS response is only usable if it is actually JavaScript, not an
// SPA index.html fallback that some hosts return for missing asset paths.
async function isUsableJs(res) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('javascript') || ct.includes('application/json')) return true
  // No content-type hint: sniff the first bytes.
  const text = await res.clone().text()
  return !text.trimStart().startsWith('<!DOCTYPE') && !text.trimStart().startsWith('<html')
}

// Tell all controlled clients to hard-reload so they pick up the new build.
function triggerHeal() {
  self.clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'ASSET_STALE' })
      }
    })
    .catch(() => {})
}
