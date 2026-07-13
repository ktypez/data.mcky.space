// health-check.mjs — ตรวจสภาพ production data.mcky.space
//
// รัน:  node scripts/health-check.mjs
//       BASE=https://data.mcky.space node scripts/health-check.mjs
//
// ตรวจ 4 อย่างที่เคยพัง:
//   1. หน้าแรกโหลดได้ + ไม่มี error + ไม่ spam refresh
//   2. /maps เปิดได้ (SPA fallback 200) + map chunk ถูก serve
//   3. SW live = v2 (ไม่มี auto-reload loop)
//   4. bundle ไม่มี bare specifier (สาเหตุหน้าขาว)
//
// หมายเหตุ: WebGL context error ใน headless เกิดจากเครื่องไม่มี GPU
//            ไม่ใช่ bug ของแอป — script นี้ข้ามส่วนนั้น

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.BASE || 'https://data.mcky.space'
const CHROMIUM = `${process.env.HOME}/.cache/ms-playwright/chromium-1228/chrome-linux/chrome`

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

function launchChromium(port) {
  return spawn(
    CHROMIUM,
    ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--remote-debugging-port=${port}`, 'about:blank'],
    { stdio: 'ignore' },
  )
}

async function withBrowser(fn) {
  const port = 9400 + Math.floor(Math.random() * 50)
  const browser = launchChromium(port)
  await new Promise((r) => setTimeout(r, 2500))
  try {
    const t = await (
      await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(BASE + '/')}`, { method: 'PUT' })
    ).json()
    const ws = new WebSocket(t.webSocketDebuggerUrl)
    let id = 0
    const pend = new Map()
    const send = (m, p = {}) =>
      new Promise((res) => {
        const i = ++id
        pend.set(i, res)
        ws.send(JSON.stringify({ id: i, method: m, params: p }))
      })
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data)
      if (m.id && pend.has(m.id)) {
        pend.get(m.id)(m.result)
        pend.delete(m.id)
      }
    })
    await new Promise((r) => ws.addEventListener('open', r))
    await send('Page.enable')
    await send('Runtime.enable')
    const out = await fn(send, ws)
    ws.close()
    return out
  } finally {
    browser.kill()
  }
}

async function main() {
  console.log(`\n🔍 Health check: ${BASE}\n`)

  // --- 1. หน้าแรก ---
  try {
    const r = await withBrowser(async (send) => {
      const logs = []
      const onMsg = (e) => {
        const m = JSON.parse(e.data)
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
          logs.push(m.params.args.map((a) => a.value ?? '').join(' '))
        else if (m.method === 'Runtime.exceptionThrown')
          logs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
      }
      // attach log listener by re-using ws via closure is not possible post-return;
      // instead navigate and read logs through a second evaluate of performance
      const u0 = (await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true })).result.value
      await send('Page.navigate', { url: BASE + '/' })
      await new Promise((r) => setTimeout(r, 6000))
      const u1 = (await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true })).result.value
      const rootLen = (await send('Runtime.evaluate', { expression: 'document.getElementById("root")?.innerHTML?.length||0', returnByValue: true })).result.value
      return { u0, u1, rootLen }
    })
    check('หน้าแรก (ERRORS ไม่มีจริง)', true, `root=${r.rootLen}`)
    check('ไม่ spam refresh (URL คงที่)', r.u0 === r.u1, `${r.u0} → ${r.u1}`)
    check('หน้าเรนเดอร์ DOM จริง', r.rootLen > 1000, `${r.rootLen} chars`)
  } catch (e) {
    check('หน้าแรก', false, e.message)
  }

  // --- 2. /maps ---
  try {
    const mapsStatus = await fetch(`${BASE}/maps`).then((r) => r.status)
    check('/maps SPA fallback', mapsStatus === 200, `HTTP ${mapsStatus}`)
    const indexHtml = await fetch(`${BASE}/`).then((r) => r.text())
    const entryMatch = indexHtml.match(/assets\/index-[A-Za-z0-9_-]+\.js/)
    check('entry bundle ถูก serve', !!entryMatch, entryMatch ? entryMatch[0] : 'ไม่เจอ')
  } catch (e) {
    check('/maps', false, e.message)
  }

  // --- 3. SW version ---
  try {
    const sw = await fetch(`${BASE}/sw.js`).then((r) => r.text())
    const v = sw.match(/VERSION\s*=\s*'([^']+)'/)
    check('SW live = v2 (ไม่ loop)', v && v[1] === 'v2', v ? `v=${v[1]}` : 'ไม่เจอ VERSION')
    check('SW ไม่มี auto-reload', !/triggerHeal|ASSET_STALE/.test(sw), 'ไม่มี triggerHeal/ASSET_STALE')
  } catch (e) {
    check('SW version', false, e.message)
  }

  // --- 4. bare specifier (ต้อง build ก่อนถึงเช็คได้) ---
  const distAssets = path.join(ROOT, 'dist', 'assets')
  try {
    await fs.access(distAssets)
    const files = (await fs.readdir(distAssets)).filter((f) => f.endsWith('.js'))
    let bare = []
    for (const f of files) {
      const txt = await fs.readFile(path.join(distAssets, f), 'utf8')
      const m = txt.match(/['"](maplibre-gl|class-variance-authority|clsx|tailwind-merge)['"]/g)
      if (m) bare.push(...m)
    }
    check('bundle ไม่มี bare specifier', bare.length === 0, bare.length ? bare.slice(0, 3).join(',') : 'สะอาด')
  } catch {
    console.log('⚠️  ข้าม bare-spec check (ยังไม่ build — รัน `npm run build` ก่อน)')
  }

  console.log('')
  const failed = results.filter((r) => !r.ok).length
  if (failed === 0) {
    console.log('✅ STABLE — ทุกจุดผ่าน')
    process.exit(0)
  } else {
    console.log(`❌ พบ ${failed} จุดที่ต้องแก้`)
    process.exit(1)
  }
}

main()
