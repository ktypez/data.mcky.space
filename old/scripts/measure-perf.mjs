// Cold/warm start measurement for the production build.
//
// Reuses the CDP pattern from check-pwa-browser.mjs, but boots its own
// headless Chromium so it can be run unattended: `npm run measure:perf`.
// Throttling constants are Lighthouse's mobile "Slow 4G" preset.
//
// Usage: node scripts/measure-perf.mjs [--url URL] [--port 4178] [--json]
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const argv = process.argv.slice(2)
const flag = name => argv.includes(name)
const opt = (name, fallback) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}

const PORT = Number(opt('--port', 4178))
const BASE = opt('--url', `http://127.0.0.1:${PORT}/`)
const REPEAT = Number(opt('--repeat', 3))
const CHROME = process.env.CHROME_PATH || '/usr/bin/chromium'

// Without a Clerk session every API call 401s and the catalog renders its
// error state, which makes LCP measure an error string. Stub the data API so
// the shell paints the same rows a signed-in user sees.
const STUB_CLIENTS = Array.from({ length: 24 }, (_, i) => ({
  id: `c${i}`,
  name: [`ลูกค้าทดสอบ ทดสอบ ${i + 1}`],
  shopName: [`ร้านค้าตัวอย่าง ${i + 1}`],
  branch: i % 3 === 0 ? 'สาขาเหนือ' : '',
  image: null,
  thumb: null,
  badge: i % 4 === 0 ? 'ทดสอบ' : null,
  hasNotes: i % 3 === 0,
  createdAt: 1750000000000 + i,
  updatedAt: 1750000000000 + i,
}))

// Lighthouse mobile slow-4G: 1.6Mbit/750Kbit/150ms, with 4x CPU slowdown.
const SLOW_4G = {
  offline: false,
  latency: 600,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
}
const CPU_THROTTLE = 4

// One browser per run, each with its own throwaway profile. Reusing a profile
// would let the service worker installed by run 1 answer run 2, which quietly
// turns every "cold" measurement after the first into a warm one.
async function launchBrowser() {
  const profile = await mkdtemp(path.join(tmpdir(), 'perf-profile-'))
  const chrome = spawn(CHROME, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    // Port 0 + DevToolsActivePort: a fixed or reused port can silently attach
    // to a previous run's still-warm browser, which invalidates the numbers.
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' })

  const portFile = path.join(profile, 'DevToolsActivePort')
  let port = null
  for (let i = 0; i < 200 && port === null; i++) {
    await new Promise(r => setTimeout(r, 50))
    try {
      const [line] = (await readFile(portFile, 'utf8')).split('\n')
      if (line && /^\d+$/.test(line.trim())) port = Number(line.trim())
    } catch {}
  }
  if (port === null) throw new Error('Chromium never reported a DevTools port')

  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) {
        return {
          port,
          kill: async () => {
            chrome.kill()
            await rm(profile, { recursive: true, force: true }).catch(() => {})
          },
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('Chromium DevTools endpoint did not come up')
}

async function openTab(onEvent, cdpPort) {
  const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0
  const pending = new Map()
  const events = []
  ws.onmessage = async ({ data }) => {
    const m = JSON.parse(data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject, timer } = pending.get(m.id)
      clearTimeout(timer); pending.delete(m.id)
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
    } else if (m.method) {
      events.push(m)
      if (onEvent) await onEvent(m, (method, params) => send(method, params))
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(`Timeout: ${method}`)) }, 30000)
    pending.set(n, { resolve, reject, timer })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  return { send, events, close: () => ws.close() }
}

async function navigate(tab, url) {
  const { send, events } = tab
  events.length = 0
  await send('Network.enable')
  await send('Page.enable')
  await send('Performance.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Network.emulateNetworkConditions', SLOW_4G)
  await send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE })
  if (flag('--stub-api')) {
    await send('Fetch.enable', { patterns: [{ urlPattern: 'https://data-api.fall3n.workers.dev/api/clients*' }] })
  }
  await send('Page.navigate', { url })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('load timeout')), 60000)
    const poll = setInterval(() => {
      if (events.some(e => e.method === 'Page.loadEventFired')) {
        clearInterval(poll); clearTimeout(timer); resolve()
      }
    }, 50)
  })
  // LCP is only final after the first user interaction or page idle; give the
  // app a beat to settle its async data fetches before reading the buffer.
  await new Promise(r => setTimeout(r, 4000))
  return events
}

async function readMetrics(tab) {
  // LCP and CLS are only exposed through observers, never getEntriesByType.
  const expression = `new Promise(resolve => {
    const nav = performance.getEntriesByType('navigation')[0] || {}
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, p.startTime]))
    const res = performance.getEntriesByType('resource')
    const fcp = paints['first-contentful-paint'] ?? null
    let lcp = null
    let lcpElement = null
    let cls = 0
    new PerformanceObserver(list => {
      const entries = list.getEntries()
      if (!entries.length) return
      const last = entries[entries.length - 1]
      lcp = last.startTime
      const node = last.element
      if (node) {
        const cls2 = typeof node.className === 'string' ? node.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''
        lcpElement = node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + (cls2 ? '.' + cls2 : '') + ' "' + (node.textContent || '').trim().slice(0, 40) + '"'
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
    setTimeout(() => resolve({
      ttfb: nav.responseStart ?? null,
      domContentLoaded: nav.domContentLoadedEventEnd ?? null,
      load: nav.loadEventEnd ?? null,
      fcp, lcp,
      domNodes: document.getElementsByTagName('*').length,
      transferBytes: res.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      decodedBytes: res.reduce((sum, r) => sum + (r.decodedBodySize || 0), 0),
      resourceCount: res.length,
      requests: res.map(r => ({ name: r.name.replace(location.origin, ''), type: r.initiatorType, transferSize: r.transferSize || 0, decodedBodySize: r.decodedBodySize || 0 }))
        .sort((a, b) => b.transferSize - a.transferSize)
        .slice(0, 12),
    lcp, lcpElement, cls,
    }), 300)
  })`
  const r = await tab.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}

// Median of a numeric field across runs, and the min-max spread for LCP.
function median(runs, field) {
  const pick = { ...runs[0] }
  for (const key of ['fcp', 'lcp', 'ttfb', 'domContentLoaded', 'load', 'transferBytes', 'resourceCount', 'domNodes']) {
    const values = runs.map(r => r[key]).filter(v => typeof v === 'number').sort((a, b) => a - b)
    if (values.length) pick[key] = values[Math.floor(values.length / 2)]
  }
  return pick
}
function spread(runs, field) {
  const values = runs.map(r => r[field]).filter(v => typeof v === 'number')
  return values.length ? `${Math.min(...values).toFixed(0)}-${Math.max(...values).toFixed(0)} ms` : 'n/a'
}

const stub = flag('--stub-api')
let report
try {
  // Webfont races make single runs swing by >1s, so every visit type is
  // measured REPEAT times, each in its own browser profile, and reported
  // as a median.
  const coldRuns = []
  const warmRuns = []
  const nonOk = new Set()
  for (let i = 0; i < REPEAT; i++) {
    const browser = await launchBrowser()
    try {
      const tab = await openTab(async (m, send) => {
        if (m.method !== 'Fetch.requestPaused') return
        const { requestId, request } = m.params
        const body = Buffer.from(JSON.stringify(
          request.url.includes('/api/clients/list') ? STUB_CLIENTS : STUB_CLIENTS.map(c => ({ ...c, address: '', lat: null, lng: null, images: [], notes: null })),
        ))
        await send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'content-type', value: 'application/json' },
            { name: 'content-length', value: String(body.length) },
            { name: 'access-control-allow-origin', value: '*' },
          ],
          body: body.toString('base64'),
        })
      }, browser.port)
      try {
        const coldEvents = await navigate(tab, BASE)
        coldRuns.push(await readMetrics(tab))
        // Second visit in the same profile: the service worker installed
        // during the cold pass, so this is the "open, use, close, open again"
        // case the PWA buys.
        await navigate(tab, BASE)
        warmRuns.push(await readMetrics(tab))
        for (const e of coldEvents) {
          if (e.method === 'Network.responseReceived' && e.params.response.status >= 400) {
            nonOk.add(`${e.params.response.status} ${e.params.response.url}`)
          }
        }
      } finally {
        tab.close()
      }
    } finally {
      await browser.kill()
    }
  }
  report = {
    url: BASE,
    throttling: 'lighthouse mobile slow-4G + 4x CPU',
    stubbedApi: stub,
    runs: REPEAT,
    cold: median(coldRuns),
    warm: median(warmRuns),
    coldSpread: spread(coldRuns, 'lcp'),
    warmSpread: spread(warmRuns, 'lcp'),
    nonOk: [...nonOk],
  }
} catch (error) {
  console.error(error)
  process.exit(1)
}

const kb = n => `${(n / 1024).toFixed(1)} KB`
const ms = n => (typeof n === 'number' ? `${n.toFixed(0)} ms` : 'n/a')
const line = (label, value) => console.log(`${label.padEnd(20)} ${String(value).padStart(12)}`)

if (flag('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`\n@ ${report.url}  (${report.throttling}, median of ${report.runs})`)
  for (const [label, run, lcpSpread] of [['cold start', report.cold, report.coldSpread], ['warm (SW)', report.warm, report.warmSpread]]) {
    console.log(`\n${label}`)
    console.log('--------------------------------------------------')
    line('TTFB', ms(run.ttfb))
    line('FCP', ms(run.fcp))
    line('LCP', `${ms(run.lcp)}  (${lcpSpread})`)
    line('CLS', typeof run.cls === 'number' ? run.cls.toFixed(4) : 'n/a')
    line('DOMContentLoaded', ms(run.domContentLoaded))
    line('load', ms(run.load))
    line('DOM nodes', run.domNodes)
    line('subresources', `${run.resourceCount} req / ${kb(run.transferBytes)}`)
  }
  console.log('\nLargest subresources (cold):')
  for (const r of report.cold.requests) console.log(`  ${kb(r.transferSize).padStart(10)}  ${r.type.padEnd(10)} ${r.name}`)
  if (report.nonOk.length) {
    console.log('\nNon-2xx responses:')
    for (const n of report.nonOk) console.log(`  ${n}`)
  }
  console.log('')
}
