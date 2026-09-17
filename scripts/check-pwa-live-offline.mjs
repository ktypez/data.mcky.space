import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const base = 'https://data.mcky.space'
const cdp = 'http://127.0.0.1:9429'
const target = await (await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j})
let id=0
const pending=new Map()
const responses=[]
ws.onmessage=({data})=>{
 const m=JSON.parse(data)
 if(m.id && pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.j(new Error(JSON.stringify(m.error))):p.r(m.result)}
 if(m.method==='Network.responseReceived' && m.params.response.url.includes('/api/clients/list')) responses.push(m.params.response.status)
}
const send=(method,params={})=>new Promise((r,j)=>{const n=++id;const timer=setTimeout(()=>j(Error(method+' timed out')),20000);pending.set(n,{r,j,timer});ws.send(JSON.stringify({id:n,method,params}))})
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const wait=async expr=>{for(let i=0;i<100;i++){try{if(await evaluate(expr))return}catch{} await new Promise(r=>setTimeout(r,300))}throw Error('Timed out: '+expr)}
const links=`[...document.querySelectorAll('a[href^="/c/"]')].map(a=>a.getAttribute('href')).sort()`
try{
 await send('Network.enable');await send('Page.enable')
 await send('Page.navigate',{url:base+'/'})
 await wait(`navigator.serviceWorker.controller && (${links}).length>0`)
 const online=await evaluate(links)
 const local=await readFile('dist/index.html','utf8')
 const live=await evaluate(`fetch('/',{cache:'no-store'}).then(r=>r.text())`)
 const asset=local.match(/src="(\/assets\/index-[^"]+\.js)"/)[1]
 assert.ok(live.includes(asset),'Production build matches local entry hash')
 const bodyBefore=await evaluate('document.body.innerText')
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0})
 await send('Page.reload',{ignoreCache:true})
 await wait(`(${links}).length>0`)
 assert.equal(await evaluate('navigator.onLine'),false)
 const offline=await evaluate(links)
 assert.deepEqual(offline,online,'Same visible real customer links after offline reload')
 assert.equal(await evaluate(`fetch('https://data-api.fall3n.workers.dev/api/clients/list',{cache:'no-store'}).then(()=>false).catch(()=>true)`),true)
 assert.equal(await evaluate('document.body.innerText'),bodyBefore)
 console.log(JSON.stringify({production:base,asset,apiResponses:responses,visibleCustomerLinks:online.length,offlineVisibleLinks:offline.length,offlineReload:true,networkRequestFails:true,unchangedVisibleText:true,scope:'Actual public catalog, no fixtures or demo; not login/photos/maps'},null,2))
}finally{
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{})
 ws.close();await fetch(`${cdp}/json/close/${target.id}`).catch(()=>{})
}
