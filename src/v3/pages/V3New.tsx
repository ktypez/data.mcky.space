import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlass, Copy, Check, X, MapPin } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useDebounce } from '@/hooks/useDebounce'
import { DISPLAY_STEP } from '@/hooks/useFilteredClients'
import { FilterKey, type Client } from '@/types/index'
import { applyCounts, applyFilter, sortByCreatedDesc } from '@/lib/filter'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import NameAvatar from '@/components/NameAvatar'
import { copyToClipboard, getMapsUrl, COPIED_FLASH_MS } from '@/lib/utils'
import { clientTextWithMaps } from '@/lib/clientText'
import { fetchClientById } from '@/lib/storage'

// NOTE: /new is a design trial (truck VariantE-v3 command language). It keeps
// its own search/filter state on purpose — the global filter store belongs to
// the catalog and must not leak between pages.

const CUTOFF = Date.now() - 7 * 86400000

const CHIPS: { key: FilterKey; label: string }[] = [
  { key: FilterKey.All, label: 'ทั้งหมด' },
  { key: FilterKey.Recent, label: 'ล่าสุด' },
  { key: FilterKey.NoImages, label: 'ไม่มีรูป' },
  { key: FilterKey.Penpay, label: 'จ่ายในวัน' },
  { key: FilterKey.Credit, label: 'บัตรเครดิต' },
]

function CopyBtn({ client }: { client: Client }) {
  const [copied, setCopied] = useState(false)
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (tRef.current) clearTimeout(tRef.current) }, [])
  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    let full = client
    if (!client.address && !client.notes) {
      const fetched = await fetchClientById(client.id)
      if (fetched) {
        full = fetched
        useClientStore.getState().updateClient(full.id, full)
      }
    }
    const ok = await copyToClipboard(clientTextWithMaps(full, getMapsUrl))
    if (!ok) return
    setCopied(true)
    if (tRef.current) clearTimeout(tRef.current)
    tRef.current = setTimeout(() => setCopied(false), COPIED_FLASH_MS)
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? 'Copied' : 'คัดลอกข้อมูลร้าน'}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${copied ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {copied ? <Check weight="bold" className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export default function V3New() {
  const clients = useClientStore((s) => s.clients)
  const displayLimit = useClientStore((s) => s.displayLimit)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterKey>(FilterKey.All)
  const [detail, setDetail] = useState<Client | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(q.trim().toLowerCase(), 200)

  const counts = useMemo(() => applyCounts(clients, CUTOFF), [clients])
  const filtered = useMemo(
    () => sortByCreatedDesc(applyFilter(clients, debounced, filter, CUTOFF)),
    [clients, debounced, filter],
  )
  const displayed = useMemo(() => filtered.slice(0, displayLimit), [filtered, displayLimit])

  // Reset window when the query changes; "/" focuses, Esc clears.
  useEffect(() => {
    useClientStore.getState().setDisplayLimit(DISPLAY_STEP)
  }, [debounced, filter])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (detail) setDetail(null)
        else setQ('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])
  // Lock body scroll while the popup is open.
  useEffect(() => {
    if (!detail) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [detail])

  const openDetail = async (c: Client) => {
    setDetail(c)
    if (!c.address && !c.notes) {
      setDetailLoading(true)
      const full = await fetchClientById(c.id)
      setDetailLoading(false)
      if (full) {
        useClientStore.getState().updateClient(full.id, full)
        setDetail(full)
      }
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <p className="text-center font-mono text-[11px] uppercase tracking-widest opacity-40">new · command trial</p>
      <h1 className="mt-1 text-center text-2xl font-semibold tracking-tight">ค้นหารายชื่อ</h1>
      <p className="mt-2 text-center text-sm opacity-50">พิมพ์เพื่อกรอง · <kbd className="rounded border border-border bg-muted px-1 font-mono text-[11px]">/</kbd> โฟกัส · <kbd className="rounded border border-border bg-muted px-1 font-mono text-[11px]">Esc</kbd> ล้าง</p>

      <div className="relative mt-8">
        <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm opacity-40">❯</span>
        <MagnifyingGlass className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ลองชื่อร้าน, ที่อยู่, หรือ id…"
          name="q"
          autoComplete="off"
          spellCheck={false}
          aria-label="ค้นหารายชื่อ"
          className="h-12 w-full rounded-2xl border border-border bg-card py-0 pl-14 pr-10 text-sm shadow-sm outline-none focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="ล้างคำค้น" className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-foreground hover:text-background">
            <X className="h-3.5 w-3.5" weight="bold" />
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-1 overflow-auto pb-1" role="group" aria-label="ตัวกรอง">
        {CHIPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className="v3-pill whitespace-nowrap"
            data-active={filter === key}
          >
            {label} <span className="opacity-60 tabular-nums">{key === FilterKey.All ? counts.total : counts[key as keyof typeof counts] ?? 0}</span>
          </button>
        ))}
      </div>

      <div aria-live="polite" className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-sm">
        <span className="font-mono text-lg font-semibold tabular-nums">{filtered.length}</span>
        <span className="text-sm opacity-60"> / {counts.total} รายการ</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {displayed.map((c) => (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => void openDetail(c)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void openDetail(c) } }}
            className="flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
          >
            {c.images[0] ? (
              <AppImage src={c.thumb ?? c.images[0]} fallbackSrc={c.thumb ? c.images[0] : undefined} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full border border-black/10 object-cover" />
            ) : (
              <NameAvatar />
            )}
            <span className="min-w-0 flex-1">
              <ClientNames client={c} variant="list" titleClassName="text-sm leading-tight truncate text-foreground" subClassName="text-xs truncate opacity-60" />
            </span>
            {c.badge && <span className="v3-pill shrink-0" data-active="false">{c.badge}</span>}
            <CopyBtn client={c} />
          </div>
        ))}
        {displayed.length === 0 && <div className="p-8 text-center text-sm opacity-50">ไม่พบรายการ — ล้างคำค้นหรือตัวกรอง</div>}
      </div>

      {displayLimit < filtered.length && (
        <button type="button" onClick={() => useClientStore.getState().setDisplayLimit(displayLimit + DISPLAY_STEP)} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 font-mono text-xs hover:bg-muted">
          <span>โหลดเพิ่ม</span>
          <span className="opacity-50 tabular-nums">{filtered.length - displayLimit} รายการ</span>
        </button>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setDetail(null)} role="dialog" aria-modal="true" aria-label="รายละเอียดร้าน">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest opacity-40">record</span>
              <button type="button" autoFocus onClick={() => setDetail(null)} aria-label="ปิด" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-foreground hover:text-background">
                <X className="h-4 w-4" weight="bold" />
              </button>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm opacity-60">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> กำลังโหลด…
              </div>
            ) : (
              <>
                <ClientNames client={detail} variant="detail" />
                {detail.address && (
                  <a href={detail.lat != null && detail.lng != null ? getMapsUrl(detail.lat, detail.lng) : undefined} target="_blank" rel="noreferrer" onClick={(e) => { if (detail.lat == null || detail.lng == null) e.preventDefault() }} className="mt-3 flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{detail.address}</span>
                  </a>
                )}
                <div className="mt-5 flex gap-2">
                  <CopyBtn client={detail} />
                  <Link to={`/c/${detail.id}`} className="flex h-9 flex-1 items-center justify-center rounded-xl bg-foreground text-sm font-medium text-background hover:opacity-90">
                    เปิดหน้าเต็ม
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
