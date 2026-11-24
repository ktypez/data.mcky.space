// App health check: boots the production build and, when Chromium is present,
// checks the shared V6 scenery, mode/palette/routing and both desktop and mobile
// viewports over CDP. Without Chromium it falls back to a curl-style HTTP smoke
// test (see AGENTS.md).
//
// Usage: node scripts/health-check.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PORT = Number(process.env.HEALTH_PORT ?? 4187)
const BASE = `http://127.0.0.1:${PORT}/`
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/chromium'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForServer() {
  for (let i = 0; i < 150; i++) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {}
    await sleep(100)
  }
  throw new Error(`preview server did not start at ${BASE}`)
}

async function withPreview(run) {
  const server = spawn(
    path.join(ROOT, 'node_modules/.bin/vite'),
    ['preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' },
  )
  try {
    await waitForServer()
    return await run()
  } finally {
    server.kill('SIGTERM')
  }
}

async function hasChromium() {
  try {
    await access(CHROME)
    return true
  } catch {
    return false
  }
}

async function launchBrowser() {
  const profile = await mkdtemp(path.join(tmpdir(), 'data-health-'))
  const chrome = spawn(CHROME, [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' })
  const portFile = path.join(profile, 'DevToolsActivePort')
  let port = null
  for (let i = 0; i < 200 && port === null; i++) {
    await sleep(50)
    try {
      const [line] = (await readFile(portFile, 'utf8')).split('\n')
      if (/^\d+$/.test(line.trim())) port = Number(line.trim())
    } catch {}
  }
  if (port === null) {
    chrome.kill()
    await rm(profile, { recursive: true, force: true }).catch(() => {})
    throw new Error('Chromium never reported a DevTools port')
  }
  return {
    port,
    close: async () => {
      chrome.kill('SIGTERM')
      await rm(profile, { recursive: true, force: true }).catch(() => {})
    },
  }
}

async function cdp(port) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  const consoleErrors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id)
      clearTimeout(timer)
      pending.delete(message.id)
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result)
      return
    }
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails?.text ?? 'uncaught exception')
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args?.map((a) => a.value ?? a.description).join(' ') ?? 'console error')
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id
    const timer = setTimeout(() => {
      pending.delete(callId)
      reject(new Error(`CDP timeout: ${method}`))
    }, 30000)
    pending.set(callId, { resolve, reject, timer })
    ws.send(JSON.stringify({ id: callId, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const waitFor = async (expression, label) => {
    await evaluate(`new Promise((resolve, reject) => {
      const started = Date.now()
      const timer = setInterval(() => {
        let ok = false
        try { ok = !!(function() { return ${expression} })() } catch {}
        if (ok) { clearInterval(timer); resolve(true) }
        else if (Date.now() - started > 15000) { clearInterval(timer); reject(new Error('timeout: ${label}')) }
      }, 100)
    })`)
  }
  return {
    send, evaluate, waitFor, consoleErrors,
    close: () => ws.close(),
  }
}

async function browserCheck() {
  const browser = await launchBrowser()
  const tab = await cdp(browser.port)
  try {
    await tab.send('Runtime.enable')
    await tab.send('Page.enable')
    await tab.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    })
    await tab.send('Page.navigate', { url: `${BASE}#/` })
    await tab.waitFor(`document.querySelector('.mcky-v6-scenery .cloud') && document.querySelector('.app-workspace')`, 'app shell')

    const day = await tab.evaluate(`({
      mode: document.documentElement.dataset.v6Mode,
      palette: document.documentElement.dataset.palette,
      clouds: document.querySelectorAll('.mcky-v6-scenery .cloud').length,
      ridges: document.querySelectorAll('.mcky-v6-scenery .ridge').length,
      wrapper: !!document.querySelector('.mcky-v6-scenery-content .app-workspace'),
      overflow: document.documentElement.scrollWidth - window.innerWidth
    })`)
    assert.equal(day.mode, 'light')
    assert.equal(day.clouds, 3)
    assert.equal(day.ridges, 3)
    assert.ok(day.wrapper, 'routed content must sit above the scenery')
    assert.ok(day.overflow <= 1, `1440px overflow: ${day.overflow}`)

    await tab.evaluate(`document.querySelector('.mcky-v6-mode-toggle').click()`)
    await tab.waitFor(`document.documentElement.dataset.v6Mode === 'dark' && document.querySelector('.mcky-v6-scenery .star')`, 'night scenery')
    const night = await tab.evaluate(`({
      stars: document.querySelectorAll('.mcky-v6-scenery .star').length,
      buildings: document.querySelectorAll('.mcky-v6-scenery .building').length,
      windows: document.querySelectorAll('.mcky-v6-scenery .windows span.lit').length,
      storedMode: localStorage.getItem('data-ledger-mode'),
      extraModeKey: localStorage.getItem('mcky-v6-mode')
    })`)
    assert.equal(night.stars, 12)
    assert.equal(night.buildings, 10)
    assert.equal(night.windows, 29)
    assert.equal(night.storedMode, 'dark')
    assert.equal(night.extraModeKey, null, 'the shared toggle must not create a second stored mode')

    await tab.evaluate(`location.hash = '#/settings'`)
    await tab.waitFor(`document.querySelector('.page-shell--settings')`, 'settings route')
    await tab.evaluate(`[...document.querySelectorAll('#settings-panel [role=radio]')]
      .find((el) => el.textContent.includes('Coral')).click()`)
    await tab.waitFor(`document.documentElement.dataset.palette === 'coral'`, 'palette switch')
    assert.equal(await tab.evaluate(`document.documentElement.dataset.theme`), 'coral')

    await tab.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    })
    await tab.evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
    const mobileOverflow = await tab.evaluate(`document.documentElement.scrollWidth - window.innerWidth`)
    assert.ok(mobileOverflow <= 1, `390px overflow: ${mobileOverflow}`)

    const errors = tab.consoleErrors.filter((message) =>
      !/clerk|data-api\.fall3n\.workers\.dev|r2\.dev|ERR_(BLOCKED|NAME|INTERNET|CONNECTION)/i.test(message))
    assert.deepEqual(errors, [], `console errors: ${errors.join(' | ')}`)

    return { day, night, mobileOverflow, consoleErrors: tab.consoleErrors }
  } finally {
    tab.close()
    await browser.close()
  }
}

async function curlSmoke() {
  const html = await (await fetch(BASE)).text()
  assert.match(html, /data-v6-mode/)
  assert.ok(!html.includes('fonts.googleapis.com'), 'V6 entry must stay font-free')
  const manifest = await (await fetch(new URL('manifest.webmanifest', BASE))).text()
  assert.ok(manifest.includes('data.mcky.space') || manifest.includes('DATA'))
  const sw = await (await fetch(new URL('sw.js', BASE))).text()
  assert.ok(sw.includes('precache'))
  return { fallback: true }
}

await withPreview(async () => {
  const result = (await hasChromium()) ? await browserCheck() : await curlSmoke()
  console.log(`PASS health-check ${JSON.stringify(result)}`)
})
