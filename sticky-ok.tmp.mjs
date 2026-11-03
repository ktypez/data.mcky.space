import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'

const PORT = 9459
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const N = 220
const STUB = Array.from({ length: N }, (_, i) => ({
  id: `c${String(i).padStart(3, '0')}`, name: [`ลูกค้าทดสอบ ${i + 1}`], shopName: [`ร้านค้าตัวอย่าง ${i + 1}`],
  branch: i % 3 === 0 ? 'สาขาเหนือ' : '', image: null, thumb: null, badge: null, payment: 'none',
  hasNotes: false, notes: null,
  createdAt: new Date(Date.UTC(2026, 0, 1 + (i % 300))).toISOString(),
  updatedAt: new Date(Date.UTC(2026, 5, 1 + (i % 120))).toISOString(),
  images: [], address: '', lat: null, lng: null,
}))

const profile = mkdtempSync(join(tmpdir(), 'sok-'))
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const t = await (async () => { for (let i=0;i<40;i++){ try{ const l=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p=l.find(x=>x.type==='page'); if(p) return p }catch{} await sleep(300) } throw new Error('no target') })()
const ws = new WebSocket(t.webSocketDebuggerUrl, { maxPayload: 64*1024*1024 })
await new Promise((r)=>ws.on('open',r))
let id=0; const pending=new Map()
ws.on('message',(raw)=>{ const m=JSON.parse(raw.toString()); if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);return}
  if(m.method==='Fetch.requestPaused'){ const {requestId,request}=m.params; const body=Buffer.from(JSON.stringify(STUB))
    ws.send(JSON.stringify({id:++id,method:'Fetch.fulfillRequest',params:{requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/json; charset=utf-8'},{name:'access-control-allow-origin',value:'*'},{name:'etag',value:'"x"'}],body:body.toString('base64')}}))
  }
})
const send=(m,p={})=>new Promise((r)=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const ev=(expr)=>send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true}).then(r=>r.result?.result?.value)
await send('Runtime.enable'); await send('Page.enable')
await send('Fetch.enable',{patterns:[{urlPattern:'https://data-api.fall3n.workers.dev/*'}]})
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844})
await send('Emulation.setTouchEmulationEnabled',{enabled:true})
await send('Page.navigate',{url:'http://localhost:4186/'})
await sleep(4500)
await ev(`document.getElementById('ledger-main').scrollTop = 600`)
await sleep(600)
const r = await ev(`JSON.stringify((() => {
  const main = document.getElementById('ledger-main');
  const bar = document.querySelector('.sticky');
  const barR = bar.getBoundingClientRect();
  const mainR = main.getBoundingClientRect();
  return { scrollTop: main.scrollTop, barTop: Math.round(barR.top), mainTop: Math.round(mainR.top), stuck: Math.abs(barR.top - mainR.top) <= 2 };
})())`)
console.log(r)
ws.close(); chrome.kill('SIGKILL'); rmSync(profile,{recursive:true,force:true})
