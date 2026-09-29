import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Real production build + real Chromium. fetch is intercepted per-URL to
// model a real API: first call returns the list with an ETag, the next
// returns 304 (matching), later calls throw (offline). The app must keep
// serving the cached catalog through a reload with the network down.
const root = await mkdtemp(path.join(tmpdir(), 'data-offline-e2e-'))
await cp('dist', root, { recursive: true })
const LIST_BODY = JSON.stringify([
  { id: 'a', name: '["ร้านเอ"]', shopName: '["เอ"]', branch: '', image: null, thumb: null, badge: null, updatedAt: 1, createdAt: 1 },
  { id: 'b', name: '["ร้านบี"]', shopName: '["บี"]', branch: '', image: null, thumb: null, badge: null, updatedAt: 2, createdAt: 2 },
])
const LIST_ETAG = '"list-v1"'
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
const server = createServer(async (req, res) => {
  try {
    let name = new URL(req.url, 'http://localhost').pathname
    if (name === '/' || name === '/demo') name = '/index.html'
    const filename = path.join(root, name)
    if (!filename.startsWith(root + path.sep)) throw new Error('Invalid path')
    const body = await readFile(filename)
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(body)
  } catch { res.writeHead(404); res.end('Not found') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const BASE = `http://127.0.0.1:${server.address().port}`
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9429'
const API = 'https://data-api.fall3n.workers.dev/api/clients/list'
// Fixture state lives in the page (see the interceptor) and is never a claim
// about the real deployed API.
const interceptor = `
  // The interceptor is re-injected on every document, including reloads, so the
  // fixture state has to live in sessionStorage. Without this the test could
  // not put the "next load is offline" mode in place across a Page.reload.
  const KEY = '__fixture'
  const state = JSON.parse(sessionStorage.getItem(KEY) || 'null') || { calls: 0, mode: 'etag' }
  const flush = () => sessionStorage.setItem(KEY, JSON.stringify(state))
  window.__fixture = new Proxy(state, {
    set(target, prop, value) { target[prop] = value; flush(); return true },
  })
  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    if (!url.startsWith('https://data-api.fall3n.workers.dev/api/clients/list')) return realFetch(input, init)
    if (window.__fixture.mode === 'offline') return Promise.reject(new TypeError('Failed to fetch'))
    window.__fixture.calls++
    if (window.__fixture.mode === 'etag') {
      window.__fixture.mode = 'match'
      return Promise.resolve(new Response(${JSON.stringify(LIST_BODY)}, {
        status: 200, headers: { 'Content-Type': 'application/json', 'ETag': ${JSON.stringify(LIST_ETAG)}, 'Access-Control-Expose-Headers': 'ETag' },
      }))
    }
    if (window.__fixture.mode === 'match') {
      const etag = new Headers(init?.headers || {}).get('If-None-Match')
      if (etag === ${JSON.stringify(LIST_ETAG)}) return Promise.resolve(new Response(null, { status: 304, headers: { 'ETag': ${JSON.stringify(LIST_ETAG)} } }))
      return Promise.resolve(new Response(${JSON.stringify(LIST_BODY)}, { status: 200, headers: { 'ETag': ${JSON.stringify(LIST_ETAG)} } }))
    }
    return realFetch(input, init)
  }
`
const tabs = []
async function open() {
  // '/' is the catalog route and is in the service worker's offline
  // navigateFallbackAllowlist. /demo is not a route in this app.
  const target = await (await fetch(`${CDP}/json/new?${BASE}/`, { method: 'PUT' })).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(`Timeout ${method}`)) }, 15000)
    pending.set(n, { resolve, reject, timer })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data)
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); clearTimeout(p.timer); pending.delete(m.id)
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
    }
  }
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  const wait = async expression => {
    const end = Date.now() + 20000
    while (Date.now() < end) {
      try { if (await evaluate(expression)) return } catch (error) {
        if (!/navigated|context|closed|Cannot read|not defined/i.test(String(error))) throw error
      }
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    throw new Error(`Condition timeout: ${expression}`)
  }
  const tab = { target, ws, send, evaluate, wait }
  tabs.push(tab)
  await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: interceptor })
  // /json/new?url already started loading the document, and
  // addScriptToEvaluateOnNewDocument only applies to the *next* one. Without
  // this navigation the fetch interceptor never runs and the app hits the
  // real API instead of the fixture.
  await send('Page.navigate', { url: BASE + '/' })
  return tab
}
const catalog = `Array.from(document.querySelectorAll('a,button,[role="listitem"],[data-client-id]')).length`
const clientText = `document.body.innerText`
try {
  const tab = await open()
  await tab.wait(`document.body.innerText.length > 50`)
  // Cached rows painted from the mocked 200 (IndexedDB + store read path).
  await tab.wait(`document.body.innerText.includes('ร้านเอ') && document.body.innerText.includes('ร้านบี')`)
  assert.equal(await tab.evaluate(`window.__fixture.calls`), 1)

  // Real reload with the network down: the app must paint the cached catalog.
  await tab.evaluate(`window.__fixture.mode='offline'`)
  await tab.send('Page.reload')
  await tab.wait(`document.body.innerText.includes('ร้านเอ') && document.body.innerText.includes('ร้านบี')`)
  assert.equal(await tab.evaluate(`window.__fixture.mode`), 'offline')
  const offlineState = await tab.evaluate(`JSON.stringify({calls:window.__fixture.calls})`)

  // Network back: If-None-Match revalidation returns 304 and the app keeps data.
  // data-cache skips revalidation while an entry is younger than FRESH_MS
  // (30s), so age the stored response first — otherwise this reload would
  // correctly read the cache and never touch the network.
  const aged = await tab.evaluate(`(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('data-ledger-offline'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
    const store = db.transaction('public-responses', 'readwrite').objectStore('public-responses')
    const keys = await new Promise((res, rej) => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
    let n = 0
    for (const key of keys) {
      const entry = await new Promise((res, rej) => { const r = store.get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
      if (!entry) continue
      entry.checkedAt = Date.now() - 120000
      store.put(entry); n++
    }
    await new Promise(res => { const t = db.transaction('public-responses'); t.oncomplete = res })
    return n
  })()`)
  assert.ok(aged > 0, 'expected a cached response to age')
  await tab.evaluate(`window.__fixture.mode='match'; window.__fixture.calls=0`)
  await tab.send('Page.reload')
  await tab.wait(`document.body.innerText.includes('ร้านเอ') && document.body.innerText.includes('ร้านบี')`)
  const calls = await tab.evaluate(`window.__fixture.calls`)
  assert.equal(calls, 1, `expected exactly one conditional revalidation, got ${calls}`)
  console.log(JSON.stringify({
    passed: true, origin: BASE,
    firstLoadFromMock200: true,
    reloadOfflinePaintsCachedCatalog: true,
    offlineFixture: JSON.parse(offlineState),
    revalidateAfterReconnect: true, callsAfterReconnect: calls,
    scope: 'mock API fixture + real build + real reload; deployed-API 304 not covered here',
  }, null, 2))
} finally {
  for (const tab of tabs) {
    await fetch(`${CDP}/json/close/${tab.target.id}`).catch(() => {})
    tab.ws.close()
  }
  await new Promise(resolve => server.close(resolve))
  await rm(root, { recursive: true, force: true })
}
