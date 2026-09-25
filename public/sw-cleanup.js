// Remove legacy application caches before Workbox takes ownership.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.endsWith('-v2') || name === 'api-cache' || name === 'r2-images')
          .map((name) => caches.delete(name)),
      )
    })(),
  )
})
