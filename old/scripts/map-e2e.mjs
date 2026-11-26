// Drives a real Chromium over CDP against the map-e2e harness.
// Verifies the map pans and a marker appears after a geolocation fix,
// both inside and far outside the region (the old maxBounds clamp is
// removed — the maps no longer lock to a region).
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'

const PORT = Number(process.env.CDP_PORT ?? 9433)
const TARGET = 'http://127.0.0.1:5199/map-e2e/'

// Inside Khon Kaen bounds, and far outside them (Bangkok-ish).
const CASES = [
  { name: 'khon-kaen (inside bounds)', latitude: 16.4419, longitude: 102.836 },
  { name: 'bangkok (outside bounds)', latitude: 13.7563, longitude: 100.5018 },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function connect() {
  return new Promise((resolve, reject) => {
    const attempt = async (tries) => {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
        const list = await res.json()
        const page = list.find((t) => t.type === 'page')
        if (!page) throw new Error('no page target')
        const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
        ws.on('open', () => resolve(ws))
        ws.on('error', reject)
      } catch (err) {
        if (tries <= 0) return reject(err)
        await sleep(300)
        return attempt(tries - 1)
      }
    }
    attempt(40)
  })
}

function rpc(ws) {
  let id = 0
  const pending = new Map()
  const logs = []
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString())
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      return
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      logs.push('EXCEPTION ' + (msg.params.exceptionDetails?.exception?.description ?? ''))
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id
      pending.set(mid, { resolve, reject })
      ws.send(JSON.stringify({ id: mid, method, params }))
    })
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed')
    return r.result.value
  }
  return { send, evalJs, logs }
}

const MARKER = `document.querySelectorAll('.leaflet-marker-icon').length`

// The divIcon uses iconAnchor [14, 25] on a 28px box, so the pin's tip (the
// actual coordinate) is 25px below the box top — not at the box centre.
const PIN_POS = `(() => {
  const m = document.querySelector('.leaflet-marker-icon')
  const c = document.querySelector('.leaflet-container')
  if (!m || !c) return null
  const a = m.getBoundingClientRect(), b = c.getBoundingClientRect()
  return {
    dx: Math.round((a.left + 14) - (b.left + b.width / 2)),
    dy: Math.round((a.top + 25) - (b.top + b.height / 2)),
  }
})()`

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'map-e2e-'))
  const chrome = spawn(
    'chromium',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--window-size=900,900',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let exitCode = 0
  let ws
  try {
    ws = await connect()
    const { send, evalJs, logs } = rpc(ws)
    await send('Runtime.enable')
    await send('Page.enable')
    await send('Log.enable').catch(() => {})
    await send('Browser.grantPermissions', {
      origin: 'http://127.0.0.1:5199',
      permissions: ['geolocation'],
    }).catch(() => {})

    const waitFor = async (expr, label, tries = 60) => {
      for (let i = 0; i < tries; i++) {
        if (await evalJs(expr)) return true
        await sleep(500)
      }
      console.error(`timeout waiting for ${label}`)
      return false
    }

    const results = []
    for (const fix of CASES) {
      await send('Emulation.setGeolocationOverride', {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: 10,
      })
      // Full reload so each case starts from a clean map.
      await send('Page.navigate', { url: TARGET + '?t=' + encodeURIComponent(fix.name) })
      await waitFor(`!!document.querySelector('.leaflet-container')`, 'leaflet container')
      await waitFor(
        `[...document.querySelectorAll('button')].some(b => (b.textContent||'').includes('ใช้ตำแหน่งปัจจุบัน'))`,
        'geolocation button',
      )

      const before = { markers: await evalJs(MARKER), coords: await evalJs(`document.getElementById('coords')?.textContent`) }

      await evalJs(`(() => {
        const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').includes('ใช้ตำแหน่งปัจจุบัน'))
        b.click()
      })()`)
      await waitFor(`document.getElementById('coords')?.textContent !== 'null,null'`, 'coords update', 20)
      await sleep(1500)

      const after = {
        markers: await evalJs(MARKER),
        coords: await evalJs(`document.getElementById('coords')?.textContent`),
        pin: await evalJs(PIN_POS),
      }

      const centred = !!after.pin && Math.abs(after.pin.dx) <= 8 && Math.abs(after.pin.dy) <= 8
      const casePass = after.markers >= 1 && centred
      results.push({
        case: fix.name,
        coordsBefore: before.coords,
        coordsAfter: after.coords,
        markers: after.markers,
        pinOffset: after.pin,
        pass: casePass,
      })
      console.log(JSON.stringify(results[results.length - 1]))
    }

    const pass = results.every((r) => r.pass)
    console.log(pass ? '\nPASS: pin renders and map centres for every fix' : '\nFAIL')
    if (logs.length) console.log('console:', logs.slice(-12).join('\n'))
    exitCode = pass ? 0 : 1
  } catch (err) {
    console.error('error:', err.message)
    exitCode = 1
  } finally {
    try { ws?.close() } catch {}
    chrome.kill('SIGKILL')
    rmSync(profile, { recursive: true, force: true })
  }
  process.exit(exitCode)
}

main()
