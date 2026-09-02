import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PencilSimple, Copy, Check, LinkSimple, Trash } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { deleteClient } from '@/lib/storage'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import MapPreviewDynamic from '@/components/MapPreviewDynamic'
import { copyToClipboard, formatDate, formatDateTime, getMapsUrl, hasValidCoords, COPIED_FLASH_MS } from '@/lib/utils'
import { clientTextWithMaps } from '@/lib/clientText'

// Detail = C · Dense + map + photo — locked from Lab C
export default function V3Record(){
  const { id='' } = useParams()
  const navigate = useNavigate()
  const clients = useClientStore(s=>s.clients)
  const loading = useClientStore(s=>s.loading)
  const initialized = useClientStore(s=>s.initialized)
  const { isAdmin } = useAuthStore()
  const [lightboxIdx, setLightboxIdx] = useState<number|null>(null)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState<string|null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const tRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>()=>{ if(tRef.current) clearTimeout(tRef.current)},[])
  const copyLink = async()=>{ const ok=await copyToClipboard(window.location.href); if(!ok) return; setCopiedLink(true); if(tRef.current) clearTimeout(tRef.current); tRef.current=setTimeout(()=>setCopiedLink(false), COPIED_FLASH_MS)}
  const client = useMemo(()=>clients.find(c=>c.id===id),[clients,id])
  const coords = client && hasValidCoords(client.lat, client.lng) ? {lat: client.lat as number, lng: client.lng as number}: null
  if(!client){
    if(!initialized||loading) return <Shell><p className="font-mono text-sm opacity-60">loading…</p></Shell>
    return <Shell><div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center"><p className="font-mono text-xs uppercase text-destructive">404</p><h1 className="mt-2 font-semibold">record not found</h1><button type="button" onClick={()=>navigate('/')} className="mt-6 rounded-full border border-border px-4 py-2 text-sm hover:bg-card">back</button></div></Shell>
  }
  const copyAll = ()=> void copyToClipboard(clientTextWithMaps(client, getMapsUrl))
  const doDelete = async()=>{ setDeleting(true); setErr(null); try{ await deleteClient(client.id); useClientStore.getState().removeClient(client.id); setConfirm(false); navigate('/')}catch{ setErr('ลบไม่สำเร็จ'); setDeleting(false); setConfirm(false)}}
  const displayName = client.name[0]||client.shopName[0]||client.id.slice(0,8)
  const badgeLabel = client.badge === 'penpay' ? 'จ่ายในวัน' : client.badge === 'credit' ? 'บัตรเครดิต' : null
  const badgeStyle = client.badge === 'penpay' ? 'bg-amber-100 text-amber-800' : client.badge === 'credit' ? 'bg-blue-100 text-blue-800' : ''
  const rows: [string,string][] = [
    ['Address', client.address||'—'],
    ['Created', formatDate(client.createdAt)],
    ['Updated', formatDate(client.updatedAt)],
  ]
  return (
    <Shell>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={()=>navigate('/')} className="rounded-md border border-black/10 px-2.5 py-1 font-mono text-xs hover:bg-black/5"><ArrowLeft className="inline h-3 w-3"/> back</button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={()=>void copyLink()} className="rounded-md border border-black/10 bg-white px-2 py-1 font-mono text-xs text-black hover:bg-black/5" aria-label="Copy link">{copiedLink?<><Check weight="bold" className="inline h-3 w-3 text-emerald-600"/> copied</>:<><LinkSimple className="inline h-3 w-3"/> link</>}</button>
          {isAdmin && <button type="button" onClick={()=>navigate(`/edit/${client.id}`)} className="rounded-md border border-black/10 bg-white px-2 py-1 font-mono text-xs text-black hover:bg-black/5"><PencilSimple className="inline h-3 w-3"/> edit</button>}
          {isAdmin && <button type="button" onClick={()=>setConfirm(true)} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-xs text-red-600 hover:bg-red-100"><Trash className="inline h-3 w-3"/> del</button>}
        </div>
      </div>
      {err && <p role="alert" className="mt-4 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</p>}

      {/* Header — no avatar, just names */}
      <div className="mt-8 min-w-0">
        <div role="heading" aria-level={1}>
          <ClientNames client={client} variant="detail" titleClassName="text-lg font-semibold leading-tight break-words whitespace-normal [overflow-wrap:anywhere]" subClassName="mt-1 text-sm opacity-60 break-words whitespace-normal [overflow-wrap:anywhere]" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {badgeLabel && <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-xs font-medium ${badgeStyle}`}>{badgeLabel}</span>}
          <button type="button" onClick={copyAll} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 font-mono text-xs text-black hover:bg-black/5"><Copy className="h-3 w-3"/> copy</button>
        </div>
      </div>

      {/* Dense table — C style (no id/name/shop/photos count) */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {rows.map(([k,v])=>(
              <tr key={k} className="border-b border-border last:border-0">
                <td className="w-28 bg-muted/50 px-3 py-2 font-semibold uppercase opacity-60">{k}</td>
                <td className="px-3 py-2 leading-5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes — quote card standalone */}
      {client.notes && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <p className="font-mono text-xs uppercase tracking-wide opacity-40">Notes</p>
          <blockquote className="mt-2 border-l-2 border-foreground/20 pl-4 text-[15px] leading-7 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">“{client.notes}”</blockquote>
        </div>
      )}

      {/* Map — no title */}
      {coords && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <div className="h-56 overflow-hidden"><MapPreviewDynamic lat={coords.lat} lng={coords.lng}/></div>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="font-mono text-xs opacity-50">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
            <a href={getMapsUrl(coords.lat, coords.lng)} target="_blank" rel="noreferrer" className="font-mono text-xs underline opacity-60">open maps →</a>
          </div>
        </div>
      )}

      {/* Photos — no title, single 1:1 */}
      {client.images.length>0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {client.images.length===1 ? (
            <button type="button" onClick={()=>setLightboxIdx(0)} className="group aspect-square block w-full overflow-hidden">
              <AppImage src={client.images[0]} alt="Photo 1" className="h-full w-full object-cover group-hover:scale-[1.01] transition-transform" />
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
              {client.images.map((src:string,i:number)=>(
                <button key={i} type="button" onClick={()=>setLightboxIdx(i)} className="group aspect-square overflow-hidden bg-card">
                  <AppImage src={src} alt={`Photo ${i+1}`} className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"/>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] uppercase opacity-30">record {client.id} · created {formatDateTime(client.createdAt)}</p>

      {lightboxIdx!==null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overscroll-contain" onClick={()=>setLightboxIdx(null)} role="dialog" aria-modal="true"><img src={client.images[lightboxIdx]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain"/><button type="button" onClick={()=>setLightboxIdx(null)} className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">close</button></div>}
      {confirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"><h2 className="font-semibold">delete record?</h2><p className="mt-2 text-sm opacity-70">“{displayName}” จะเข้าถังขยะ</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setConfirm(false)} className="rounded-full border border-border px-4 py-2 text-sm">cancel</button><button type="button" disabled={deleting} onClick={()=>void doDelete()} className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60">{deleting?'deleting…':'delete'}</button></div></div></div>}
    </Shell>
  )
}
function Shell({children}:{children:React.ReactNode}){ return <div className="mx-auto w-full max-w-2xl px-6 pt-8 pb-28">{children}</div>}
