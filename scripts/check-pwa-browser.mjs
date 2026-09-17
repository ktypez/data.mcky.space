import assert from 'node:assert/strict'
const BASE = 'http://127.0.0.1:4178'
const target = await (await fetch(`http://127.0.0.1:9429/json/new?${BASE}/manifest.json`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
let id = 0
const pending = new Map()
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject, timer } = pending.get(m.id); clearTimeout(timer); pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
}
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(`Timeout: ${method}`)) }, 20000)
    pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params }))
  })
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}
try {
  await send('Network.enable')
  await evaluate(`new Promise((resolve,reject)=>{const start=Date.now(); const t=setInterval(()=>{if(document.readyState==='complete'){clearInterval(t);resolve(true)}else if(Date.now()-start>10000){clearInterval(t);reject(Error('load timeout'))}},100)})`)
  // Manifest document does not auto-register the app worker.
  await evaluate(`navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister())))`)
  // Seed only disposable caches in an isolated browser profile to test migration.
  await evaluate(`Promise.all(['ezzy-v2','api-cache','r2-images','unrelated-test'].map(n=>caches.open(n)))`)
  const sw = await evaluate(`(async()=>{await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});const r=await navigator.serviceWorker.ready;return r.active.scriptURL})()`)
  assert.equal(sw, BASE + '/sw.js')
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(async()=>{const keys=await caches.keys();if(!keys.includes('api-cache')&&navigator.serviceWorker.controller){clearInterval(t);resolve(true)}else if(++n>100){clearInterval(t);reject(Error('activation timeout'))}},100)})`)
  const keys = await evaluate('caches.keys()')
  for (const k of ['ezzy-v2','api-cache','r2-images']) assert.ok(!keys.includes(k), k)
  assert.ok(keys.includes('unrelated-test'))
  const manifest = await evaluate(`fetch('/manifest.json').then(r=>r.json())`)
  assert.equal(manifest.id, '/')
  assert.equal(await evaluate(`fetch('/').then(r=>r.text()).then(t=>(new DOMParser().parseFromString(t,'text/html')).querySelectorAll('link[rel=manifest]').length)`), 1)
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  const offline = await evaluate(String.raw`(async()=>{await navigator.serviceWorker.ready;const names=await caches.keys();const pc=await caches.open(names.find(n=>n.startsWith('workbox-precache')));const requests=await pc.keys(); const entry=requests.find(r=>/\/assets\/index-.*\.js$/.test(new URL(r.url).pathname)); return {entry:!!entry && (await fetch(entry.url)).ok, api:await fetch('/api/pwa-offline-probe').then(()=>false).catch(()=>true), remote:await fetch('https://data-api.fall3n.workers.dev/api/pwa-offline-probe').then(()=>false).catch(()=>true)}})()`)
  assert.deepEqual(offline, { entry: true, api: true, remote: true })
  await send('Page.navigate', { url: BASE + '/demo' })
  const shell = await evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('link[rel=manifest]')){clearInterval(t);resolve(true)}else if(++n>50){clearInterval(t);reject(Error('offline shell timeout'))}},100)})`)
  assert.ok(shell)
  console.log(JSON.stringify({ sw, keys, offline, offlineShell: shell, note: 'SW/static-shell test only; not authenticated offline customer functionality' }, null, 2))
} finally {
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(()=>{})
  ws.close()
}
