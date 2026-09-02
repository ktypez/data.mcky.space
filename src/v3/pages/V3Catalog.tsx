import { useEffect, useMemo, useRef, useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, Copy, Check, Plus, X, NotePencil } from '@phosphor-icons/react'
import { useFilteredClients, DISPLAY_STEP } from '@/hooks/useFilteredClients'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { FilterKey } from '@/types/index'
import type { Client } from '@/types/index'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import { copyToClipboard, getMapsUrl, COPIED_FLASH_MS } from '@/lib/utils'
import { clientTextWithMaps } from '@/lib/clientText'

function RowCopy({ client, focused }: { client: Client; focused: boolean }){
  const [copied, setCopied] = useState(false)
  const tRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>()=>{ if(tRef.current) clearTimeout(tRef.current)},[])
  const onCopy = async(e: React.MouseEvent)=>{
    e.stopPropagation()
    const ok = await copyToClipboard(clientTextWithMaps(client, getMapsUrl))
    if(!ok) return
    setCopied(true)
    if(tRef.current) clearTimeout(tRef.current)
    tRef.current = setTimeout(()=>setCopied(false), COPIED_FLASH_MS)
  }
  const onKeyDown = (e: React.KeyboardEvent)=>{ if(e.key==='Enter' || e.key===' ') e.stopPropagation() }
  return (
    <button type="button" onClick={onCopy} onKeyDown={onKeyDown} aria-label={copied? 'Copied' : `Copy ${client.shopName[0]||client.name[0]||client.id}`} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${copied ? 'border-emerald-500 bg-emerald-500 text-white' : focused ? 'border-background/20 bg-background text-foreground hover:bg-background' : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
      {copied ? <Check weight="bold" className="h-3.5 w-3.5"/> : <Copy className="h-3.5 w-3.5"/>}
    </button>
  )
}

export default function V3Catalog() {
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const search = useFilterStore(s=>s.search)
  const setSearch = useFilterStore(s=>s.setSearch)
  const filter = useFilterStore(s=>s.filter)
  const setFilter = useFilterStore(s=>s.setFilter)
  const { filtered, displayed, hasMore, displayLimit, counts } = useFilteredClients({ newestCreatedFirst: true })
  const [focused, setFocused] = useState(0)
  const sorted = useMemo(()=> displayed, [displayed])
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key==='ArrowDown') { e.preventDefault(); setFocused(f=>Math.min(f+1, sorted.length-1)) }
    if (e.key==='ArrowUp') { e.preventDefault(); setFocused(f=>Math.max(f-1, 0)) }
    if (e.key==='Enter' && sorted[focused]) navigate(`/c/${sorted[focused].id}`)
  }
  const loadMoreRef = useRef<HTMLButtonElement>(null)
  const anchorRef = useRef<number|null>(null)
  const loadMore = () => {
    const btn = loadMoreRef.current
    if(btn) anchorRef.current = btn.getBoundingClientRect().top
    useClientStore.getState().setDisplayLimit(displayLimit + DISPLAY_STEP)
  }
  useLayoutEffect(()=>{
    const btn = loadMoreRef.current
    const anchor = anchorRef.current
    anchorRef.current = null
    if(!btn || anchor===null) return
    const delta = btn.getBoundingClientRect().top - anchor
    if(Math.abs(delta)>1) window.scrollBy({top: delta})
  },[displayLimit])

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Registry</h1>
      <p className="mt-2 text-center text-sm opacity-50">พิมพ์เพื่อกรอง · ลูกศร ↑↓ เลือก · Enter เปิด</p>
      <div className="mt-8 flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
          <input autoFocus value={search} onChange={e=>{setSearch(e.target.value); setFocused(0)}} onKeyDown={onKeyDown} placeholder="Type a name, shop, or id…  (⌘K)" name="q" autoComplete="off" spellCheck={false} className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm shadow-sm outline-none focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5" />
          {search ? (
            <button type="button" onClick={()=>{setSearch(''); setFocused(0)}} className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-foreground hover:text-background" aria-label="Clear search">
              <X className="h-3.5 w-3.5" weight="bold" />
            </button>
          ) : (
            <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-foreground px-2.5 py-1 font-mono text-[10px] text-background md:block">⌘K</span>
          )}
        </div>
        {isAdmin && <button onClick={()=>navigate('/add')} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm hover:opacity-90" aria-label="เพิ่ม">
          <Plus className="h-5 w-5" weight="bold" />
        </button>}
      </div>
      <div className="mt-3 flex gap-1 overflow-auto pb-1">
        {Object.values(FilterKey).filter(k=> k!==FilterKey.All && k!==FilterKey.WithImages).map(k=>{
          const labelMap: Record<string,string> = {
            [FilterKey.NoImages]: 'ไม่มีรูป',
            [FilterKey.Recent]: 'ล่าสุด',
            [FilterKey.Penpay]: 'จ่ายในวัน',
            [FilterKey.Credit]: 'บัตรเครดิต',
          }
          return (
            <button key={k} onClick={()=>{setFilter(filter===k ? FilterKey.All : k as FilterKey); setFocused(0)}} data-active={filter===k} aria-pressed={filter===k} className="v3-pill whitespace-nowrap">
              {labelMap[k] ?? k} <span className="opacity-60">{counts[k as keyof typeof counts]??0}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center font-mono text-xs opacity-30">{filtered.length} / {counts.total} · {filter!==FilterKey.All?`filtered: ${(():string=>{ const m:Record<string,string>={[FilterKey.Penpay]:'จ่ายในวัน',[FilterKey.Credit]:'บัตรเครดิต',[FilterKey.WithImages]:'มีรูป',[FilterKey.NoImages]:'ไม่มีรูป',[FilterKey.Recent]:'ล่าสุด'}; return m[filter]??filter})()}`:'all'}</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm [content-visibility:auto] [contain-intrinsic-size:1000px]">
        {sorted.map((c, i)=>(
          <div key={c.id} role="button" tabIndex={0} onClick={()=>navigate(`/c/${c.id}`)} onMouseEnter={()=>setFocused(i)} onKeyDown={e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); navigate(`/c/${c.id}`)}}} className={`flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer ${i===focused?'bg-foreground text-background':'hover:bg-muted/50'} ${i!==sorted.length-1?'border-b border-border':''}`}>
            {c.images[0] ? (
              <AppImage src={c.images[0]} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover border border-black/10" />
            ) : (
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-mono ${i===focused?'bg-background text-foreground':'bg-muted text-muted-foreground'}`}>{(c.shopName[0]||c.name[0]||'·').trim().charAt(0).toUpperCase()}</span>
            )}
            <span className="min-w-0 flex-1">
              <ClientNames client={c} variant="list" titleClassName={`text-sm leading-tight truncate ${i===focused?'text-background':'text-foreground'}`} subClassName={`text-xs truncate ${i===focused?'text-background/60':'opacity-60'}`} />
            </span>
            {c.notes && (
              <span className="flex shrink-0 text-red-500" title={c.notes} aria-label="มีโน้ต">
                <NotePencil size={14} weight="fill" />
              </span>
            )}
            <RowCopy client={c} focused={i===focused} />
          </div>
        ))}
        {sorted.length===0 && <div className="p-8 text-center text-sm opacity-50">no matches — clear search or filter</div>}
      </div>
      {hasMore && (
        <button ref={loadMoreRef} type="button" onClick={loadMore} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 font-mono text-xs hover:bg-muted">
          <span>โหลดเพิ่ม</span>
          <span className="opacity-50 tabular-nums">{filtered.length - displayLimit} รายการ</span>
        </button>
      )}
    </div>
  )
}
