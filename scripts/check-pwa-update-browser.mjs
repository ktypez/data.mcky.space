import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Real production build + real Chromium. Only version markers are test fixtures.
const root = await mkdtemp(path.join(tmpdir(), 'data-update-e2e-'))
await cp('dist', root, { recursive: true })
const originalSW = await readFile(path.join(root, 'sw.js'), 'utf8')
const originalHTML = await readFile(path.join(root, 'index.html'), 'utf8')
async function publish(version) {
  await writeFile(path.join(root, 'index.html'), originalHTML.replace('</head>', `<meta name="e2e-build" content="${version}"></head>`))
  // Change the actual Workbox precache manifest revision of index.html.
  const sw = originalSW.replace(/(\{url:"index.html",revision:")[^"]+("\})/, `$1e2e-${version}$2`)
  assert.notEqual(sw, originalSW, 'Updated HTML has a matching precache revision')
  await writeFile(path.join(root, 'sw.js'), sw + `\nself.addEventListener('message',e=>{if(e.data==='E2E_VERSION')e.ports[0].postMessage('${version}')});\n`)
}
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
await publish('A')
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const BASE = `http://127.0.0.1:${server.address().port}`
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9429'
const tabs = []
async function open() {
  const target = await (await fetch(`${CDP}/json/new?${BASE}/demo`, { method: 'PUT' })).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  const events = new Map()
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
    } else events.get(m.method)?.(m.params)
  }
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  const wait = async expression => {
    const end = Date.now() + 20000
    while (Date.now() < end) {
      try { if (await evaluate(expression)) return true } catch (error) {
        if (!/navigated|context|closed|Cannot read|not defined/i.test(String(error))) throw error
      }
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    throw new Error(`Condition timeout: ${expression}`)
  }
  const tab = { target, ws, send, events, evaluate, wait }
  tabs.push(tab)
  await send('Page.enable')
  return tab
}
const version = `(async()=>{const c=navigator.serviceWorker.controller;if(!c)return null;return new Promise((resolve,reject)=>{const ch=new MessageChannel();const t=setTimeout(()=>reject(Error('worker version timeout')),5000);ch.port1.onmessage=e=>{clearTimeout(t);resolve(e.data)};c.postMessage('E2E_VERSION',[ch.port2])})})()`
const button = `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('อัปเดตและรีเฟรช'))`
try {
  const first = await open()
  await first.wait(`navigator.serviceWorker.controller && document.body.innerText.length>100`)
  assert.equal(await first.evaluate(version), 'A')
  await first.evaluate('window.originalController=navigator.serviceWorker.controller')
  // Workbox treats rapid (<60s) installs as external registrations.
  // Model two real releases, not development-time update churn.
  await new Promise(resolve => setTimeout(resolve, 61000))
  await publish('B')
  await first.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
  await first.wait(`navigator.serviceWorker.getRegistration().then(r=>r.waiting?.state==='installed')`)
  await first.wait(`!!(${button})`)
  assert.equal(await first.evaluate(version), 'A')
  assert.equal(await first.evaluate('navigator.serviceWorker.controller===window.originalController'), true)

  const second = await open()
  await second.wait(`navigator.serviceWorker.controller && !!(${button})`)
  await second.send('Page.reload')
  await second.wait(`navigator.serviceWorker.controller && !!(${button})`)
  assert.equal(await second.evaluate(version), 'A')
  assert.equal(await second.evaluate(`document.querySelector('meta[name="e2e-build"]').content`), 'A')
  assert.equal(await second.evaluate(`navigator.serviceWorker.getRegistration().then(r=>r.waiting?.state)`), 'installed')
  // Actual banner click opens the confirmation; CDP accepts as the user would.
  let confirmed = false
  second.events.set('Page.javascriptDialogOpening', () => {
    confirmed = true
    void second.send('Page.handleJavaScriptDialog', { accept: true })
  })
  await second.evaluate(`setTimeout(()=>(${button}).click(),0);true`)
  await second.wait(`document.querySelector('meta[name="e2e-build"]')?.content==='B'`)
  assert.equal(confirmed, true)
  assert.equal(await second.evaluate(version), 'B')
  assert.equal(await second.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.waiting===null)'), true)
  assert.equal(await second.evaluate(`!!(${button})`), false)
  // Only the accepting tab reloads. Other tabs keep their page state,
  // but clientsClaim transfers their controller; users must save all tabs.
  assert.equal(await first.evaluate(version), 'B')
  assert.equal(await first.evaluate(`document.querySelector('meta[name="e2e-build"]').content`), 'A')
  console.log(JSON.stringify({ passed: true, origin: BASE, initial: 'A', waiting: 'B', bannerInBothTabs: true, secondTabReloadStillA: true, activationBeforeClick: false, confirmationAccepted: confirmed, afterClick: 'B', otherTabPage: 'A', otherTabController: 'B' }, null, 2))
} finally {
  for (const tab of tabs) {
    await fetch(`${CDP}/json/close/${tab.target.id}`).catch(()=>{})
    tab.ws.close()
  }
  await new Promise(resolve => server.close(resolve))
  await rm(root, { recursive: true, force: true })
}
