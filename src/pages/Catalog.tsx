import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MagnifyingGlass, Copy, Check, Plus, X, NotePencil } from '@phosphor-icons/react'
import { useFilteredClients } from '@/hooks/useFilteredClients'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useAuthStore } from '@/stores/auth-store'
import { FilterKey } from '@/types/index'
import type { Client } from '@/types/index'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import NameAvatar from '@/components/NameAvatar'
import { copyToClipboard, getMapsUrl, COPIED_FLASH_MS } from '@/lib/utils'
import { clientTextWithMaps } from '@/lib/clientText'
import { fetchClientByIdResult } from '@/lib/storage'

function RowCopy({ client, focused }: { client: Client; focused: boolean }) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (tRef.current) clearTimeout(tRef.current)
    }
  }, [])

  const onCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (loading) return
    setMessage(null)
    setLoading(true)
    try {
      let full = client
      if (!client.address && !client.notes) {
        const result = await fetchClientByIdResult(client.id)
        const fetchedClient = result.status === 'found' || (result.status === 'offline' && result.client) ? result.client : null
        if (fetchedClient) {
          full = fetchedClient
          useClientStore.getState().upsertClient(full)
        } else if (result.status === 'not-found') {
          if (mountedRef.current) setMessage('ไม่พบรายการ')
          return
        } else if (result.status === 'offline') {
          if (mountedRef.current) setMessage('ออฟไลน์: อาจคัดลอกข้อมูลไม่ครบ')
        } else if (result.status === 'error') {
          if (mountedRef.current) setMessage('โหลดข้อมูลก่อนคัดลอกไม่สำเร็จ')
          return
        }
      }
      const ok = await copyToClipboard(clientTextWithMaps(full, getMapsUrl))
      if (!ok) {
        if (mountedRef.current) setMessage('คัดลอกไม่สำเร็จ')
        return
      }
      if (!mountedRef.current) return
      setCopied(true)
      if (tRef.current) clearTimeout(tRef.current)
      tRef.current = setTimeout(() => setCopied(false), COPIED_FLASH_MS)
    } catch {
      if (mountedRef.current) setMessage('คัดลอกไม่สำเร็จ')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={loading}
      aria-label={`${message ? `${message} ` : ''}${copied ? 'คัดลอกแล้ว' : `คัดลอก ${client.shopName[0] || client.name[0] || client.id}`}`}
      title={message ?? undefined}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xs transition-colors disabled:cursor-wait disabled:opacity-60 ${copied ? 'border-success bg-success text-success-foreground' : focused ? 'border-background/30 bg-background text-foreground hover:bg-background' : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="กำลังคัดลอก" /> : copied ? <Check weight="bold" className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </button>
  )
}

function ClientRow({
  client,
  active,
  index,
  onOpen,
  onFocus,
  style,
  measureElement,
}: {
  client: Client
  active: boolean
  index: number
  onOpen: () => void
  onFocus: () => void
  style?: React.CSSProperties
  measureElement: (node: HTMLElement | null) => void
}) {
  return (
    <div
      ref={measureElement}
      data-index={index}
      style={style}
      onMouseEnter={onFocus}
      className={`flex min-h-16 w-full items-center border-b border-border ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
    >
      <button
        type="button"
        onClick={onOpen}
        onFocus={onFocus}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-1.5 text-left"
      >
        {client.images[0] ? (
          <AppImage
            src={client.thumb ?? client.images[0]}
            fallbackSrc={client.thumb ? client.images[0] : undefined}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full object-cover border border-border"
          />
        ) : (
          <NameAvatar className={active ? 'ring-2 ring-background' : ''} />
        )}
        <span className="min-w-0 flex-1">
          <ClientNames
            client={client}
            variant="list"
            titleClassName={`truncate py-0.5 text-sm leading-6 ${active ? 'text-primary-foreground' : 'text-foreground'}`}
            subClassName={`truncate py-0.5 text-xs leading-5 ${active ? 'text-primary-foreground/60' : 'opacity-60'}`}
          />
        </span>
        {(client.hasNotes || client.notes?.trim()) && (
          <span className="flex shrink-0 text-destructive" title={client.notes?.trim() || 'มีโน้ต'}>
            <NotePencil size={14} weight="fill" aria-hidden />
            <span className="sr-only">มีโน้ต</span>
          </span>
        )}
      </button>
      <div className="pr-3">
        <RowCopy client={client} focused={active} />
      </div>
    </div>
  )
}

const CATALOG_FILTERS = [
  { key: FilterKey.NoImages, countKey: 'noImages' },
  { key: FilterKey.Notes, countKey: 'notes' },
  { key: FilterKey.Recent, countKey: 'recent' },
  { key: FilterKey.Penpay, countKey: 'penpay' },
  { key: FilterKey.Credit, countKey: 'credit' },
] as const

const FILTER_LABELS: Record<FilterKey, string> = {
  [FilterKey.All]: 'ทั้งหมด',
  [FilterKey.WithImages]: 'มีรูป',
  [FilterKey.NoImages]: 'ไม่มีรูป',
  [FilterKey.Notes]: 'มีโน้ต',
  [FilterKey.Recent]: 'ล่าสุด',
  [FilterKey.Penpay]: 'จ่ายในวัน',
  [FilterKey.Credit]: 'บัตรเครดิต',
}

export default function CatalogPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const search = useFilterStore(s => s.search)
  const setSearch = useFilterStore(s => s.setSearch)
  const filter = useFilterStore(s => s.filter)
  const setFilter = useFilterStore(s => s.setFilter)
  const loading = useClientStore(s => s.loading)
  const error = useClientStore(s => s.error)
  const offline = useClientStore(s => s.offline)
  const refresh = useClientStore(s => s.refresh)
  const { filtered, counts } = useFilteredClients({ newestCreatedFirst: true })
  const [focused, setFocused] = useState(0)
  const sorted = filtered

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && sorted.length > 0) {
      e.preventDefault()
      setFocused(f => Math.min(f + 1, sorted.length - 1))
    }
    if (e.key === 'ArrowUp' && sorted.length > 0) {
      e.preventDefault()
      setFocused(f => Math.max(f - 1, 0))
    }
    if (e.key === 'Enter' && sorted[focused]) navigate(`/c/${encodeURIComponent(sorted[focused].id)}`)
  }

  useEffect(() => {
    setFocused(f => Math.min(f, Math.max(sorted.length - 1, 0)))
  }, [sorted.length])

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })
  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (sorted.length === 0) return
    try { virtualizer.scrollToIndex(focused, { align: 'auto' }) } catch { /* index can lag a filtered list */ }
  }, [focused, sorted.length, virtualizer])

  const retry = () => { void refresh().catch(() => undefined) }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col overflow-hidden px-6 pb-4 pt-6">
      <h1 className="sr-only">รายการลูกค้า</h1>
      <div className="mt-0 flex shrink-0 gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" aria-hidden />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setFocused(0) }}
            onKeyDown={onKeyDown}
            placeholder="ค้นหาชื่อ ร้าน หรือ ID…"
            aria-label="ค้นหาชื่อ ร้าน หรือ ID"
            name="q"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm shadow-sm outline-none focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5"
          />
          {search ? (
            <button type="button" onClick={() => { setSearch(''); setFocused(0) }} className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground" aria-label="ล้างการค้นหา">
              <X className="h-3.5 w-3.5" weight="bold" aria-hidden />
            </button>
          ) : (
            <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] text-primary-foreground md:block">⌘K</span>
          )}
        </div>
        {isAdmin && <button type="button" onClick={() => navigate('/add')} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm hover:opacity-90" aria-label="เพิ่มรายการ"><Plus className="h-5 w-5" weight="bold" aria-hidden /></button>}
      </div>

      <div className="mt-3 flex shrink-0 gap-0.5 overflow-auto pb-1" role="group" aria-label="ตัวกรองรายการ">
        {CATALOG_FILTERS.map(({ key, countKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setFilter(filter === key ? FilterKey.All : key); setFocused(0) }}
            data-active={filter === key}
            aria-pressed={filter === key}
            className="ledger-pill whitespace-nowrap"
          >
            {FILTER_LABELS[key]} <span className="opacity-60">{counts[countKey]}</span>
          </button>
        ))}
      </div>

      <p className="mt-2 shrink-0 text-center font-mono text-xs opacity-30">{filtered.length} / {counts.total} · {filter !== FilterKey.All ? `กรอง: ${filterLabel(filter)}` : 'ทั้งหมด'}</p>

      {offline && <p className="mt-3 shrink-0 rounded-xl border border-border bg-muted px-3 py-2 text-center text-xs text-muted-foreground" role="status">อยู่ออฟไลน์ — กำลังแสดงข้อมูลที่บันทึกไว้</p>}
      {error && sorted.length === 0 && <div className="mt-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert"><span>โหลดรายการไม่สำเร็จ</span><button type="button" onClick={retry} className="shrink-0 rounded-full border border-destructive/40 px-3 py-1.5 text-xs hover:bg-destructive/10">ลองใหม่</button></div>}

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading && sorted.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดรายการ…</div>
        ) : sorted.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm opacity-50">{error ? 'โหลดรายการไม่สำเร็จ' : 'ไม่พบรายการ — ลองล้างการค้นหาหรือเปลี่ยนตัวกรอง'}</div>
        ) : (
          <div ref={parentRef} className="h-full overflow-auto overscroll-contain">
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualItems.map(vi => {
                const c = sorted[vi.index]
                return (
                  <ClientRow
                    key={c.id}
                    client={c}
                    active={vi.index === focused}
                    index={vi.index}
                    onOpen={() => navigate(`/c/${encodeURIComponent(c.id)}`)}
                    onFocus={() => setFocused(vi.index)}
                    measureElement={virtualizer.measureElement}
                    style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function filterLabel(filter: FilterKey): string {
  return FILTER_LABELS[filter]
}
