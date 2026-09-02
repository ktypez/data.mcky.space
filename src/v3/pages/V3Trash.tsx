import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useClientStore } from '@/stores/client-store'
import { apiFetch } from '@/lib/api'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import { formatDateTime } from '@/lib/utils'

// Trash = E · Command — focused list, keyboard style
interface TrashItem { id:string; name:string[]; shopName:string[]; images:string[]; badge:string|null; deletedAt:number}
export default function V3Trash(){
  const {isAdmin}=useAuthStore()
  const [items,setItems]=useState<TrashItem[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [confirm,setConfirm]=useState<TrashItem|null>(null)
  const [busy,setBusy]=useState(false)
  const [focused,setFocused]=useState(0)
  const refresh=useClientStore(s=>s.refresh)
  const fetchTrash=useCallback(async()=>{ setLoading(true); setError(null); try{ const res=await apiFetch('/api/clients/trash'); if(res.ok) setItems(await res.json()); else setError('โหลดถังขยะไม่สำเร็จ')}catch{ setError('โหลดถังขยะไม่สำเร็จ')} finally{ setLoading(false)}},[])
  useEffect(()=>{ if(isAdmin) void fetchTrash()},[isAdmin, fetchTrash])
  useEffect(()=>{ setFocused(0)},[items.length])
  if(!isAdmin) return <Navigate to="/" replace/>
  const restore=async(id:string)=>{ setError(null); try{ const res=await apiFetch('/api/clients/trash?action=restore',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id})}); if(res.ok){ setItems(p=>p.filter(c=>c.id!==id)); void refresh().catch(()=>undefined)} else setError('กู้คืนไม่สำเร็จ')}catch{ setError('กู้คืนไม่สำเร็จ')}}
  const forceDelete=async(id:string)=>{ setBusy(true); setError(null); try{ const res=await apiFetch('/api/clients/trash?action=force-delete',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id})}); if(res.ok) setItems(p=>p.filter(c=>c.id!==id)); else setError('ลบไม่สำเร็จ')}catch{ setError('ลบไม่สำเร็จ')} finally{ setBusy(false); setConfirm(null)}}
  const onKeyDown = (e: React.KeyboardEvent)=>{
    if(e.key==='ArrowDown'){ e.preventDefault(); setFocused(f=> Math.min(f+1, items.length-1))}
    else if(e.key==='ArrowUp'){ e.preventDefault(); setFocused(f=> Math.max(f-1, 0))}
    else if(e.key==='Enter' && items[focused]) void restore(items[focused].id)
    else if((e.key==='Delete' || e.key==='Backspace') && items[focused]) setConfirm(items[focused])
  }
  return (
    <div className="mx-auto w-full max-w-md px-6 pt-10 pb-28">
      <h1 className="text-center text-xl font-semibold tracking-tight">Trash</h1>
      <p className="mt-1 text-center font-mono text-xs opacity-40">{loading?'loading…': <>{items.length} items · ↑↓ to focus · Enter to restore</>}</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
      <div tabIndex={0} onKeyDown={onKeyDown} className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {items.map((c,i)=>(
          <div key={c.id} role="button" tabIndex={-1} onMouseEnter={()=>setFocused(i)} onClick={()=>void restore(c.id)} className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left ${i===focused?'bg-foreground text-background':'hover:bg-muted/50'} border-b border-border last:border-0`}>
            {c.images[0]? <AppImage src={c.images[0]} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover border border-black/10"/> : <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono ${i===focused?'bg-background text-foreground':'bg-muted text-muted-foreground'}`}>{(c.shopName[0]||c.name[0]||'·').trim().charAt(0).toUpperCase()}</span>}
            <span className="min-w-0 flex-1">
              <ClientNames client={c as any} variant="list" titleClassName={`text-sm truncate ${i===focused?'text-background':'text-foreground'}`} subClassName={`text-xs truncate ${i===focused?'text-background/60':'opacity-60'}`} />
              <span className={`font-mono text-[10px] ${i===focused?'text-background/50':'opacity-30'}`}>deleted {formatDateTime(c.deletedAt)}</span>
            </span>
            <span className="flex shrink-0 gap-1">
              <button onClick={(e)=>{e.stopPropagation(); void restore(c.id)}} className={`rounded-full px-3 py-1 text-xs ${i===focused?'bg-background text-foreground':'border border-border bg-card'}`}>Restore</button>
              <button onClick={(e)=>{e.stopPropagation(); setConfirm(c)}} aria-label="Delete forever" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold leading-none transition-colors ${i===focused?'border-destructive bg-destructive text-destructive-foreground':'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive'}`}>×</button>
            </span>
          </div>
        ))}
        {!loading && items.length===0 && !error && <div className="p-8 text-center text-sm opacity-50">trash empty</div>}
      </div>
      {confirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"><h2 className="font-semibold">delete forever?</h2><p className="mt-2 text-sm opacity-60">“{confirm.name[0]||confirm.shopName[0]||confirm.id.slice(0,8)}” จะหายถาวร</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setConfirm(null)} className="rounded-full border border-border px-4 py-2 text-sm">cancel</button><button type="button" disabled={busy} onClick={()=>void forceDelete(confirm.id)} className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60">{busy?'deleting…':'delete forever'}</button></div></div></div>}
    </div>
  )
}
