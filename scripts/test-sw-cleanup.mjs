import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import assert from 'node:assert/strict'
const names = ['ezzy-v2', 'api-cache', 'r2-images', 'unrelated-cache', 'workbox-precache-current']
const deleted = []
const handlers = {}
let done
runInNewContext(readFileSync('public/sw-cleanup.js', 'utf8'), {
  self: { addEventListener: (event, fn) => { handlers[event] = fn }, skipWaiting() {}, clients: { claim: async () => {} } },
  caches: { keys: async () => names, delete: async name => { deleted.push(name); return true } },
})
assert.equal(handlers.install, undefined, 'Cleanup must not force activation on install')
handlers.activate({ waitUntil: promise => { done = promise } })
await done
assert.deepEqual(deleted.sort(), ['api-cache', 'ezzy-v2', 'r2-images'])
console.log('PASS: removes only three obsolete app caches; preserves unrelated and current caches')
