import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapTrifold, X, MagnifyingGlass } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_CENTER, KHON_KAEN_BOUNDS, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'
import { hasValidCoords } from '@/lib/utils'
import { fetchClients } from '@/lib/storage'
import { clientMatchesQuery } from '@/lib/clientNames'
import type { Client } from '@/types/index'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'

type LL = typeof import('leaflet')
async function loadLeaflet(): Promise<LL> { const [m] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]); return (m.default ?? m) as LL }
function clusterHtml(count: number, size: number): string { return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:var(--primary);color:var(--primary-foreground);display:flex;align-items:center;justify-content:center;font-size:${size > 40 ? 13 : 12}px;font-weight:700;border:2px solid var(--card);box-shadow:0 2px 8px rgba(0,0,0,0.25);">${count}</div>` }
function dotHtml(): string { return `<div style="width:12px;height:12px;border-radius:999px;background:var(--primary);border:2px solid var(--card);box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>` }

export default function V3Maps() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<LL['Map']> | null>(null)
  const layerRef = useRef<InstanceType<LL['TileLayer']> | null>(null)
  const libRef = useRef<LL | null>(null)
  const markersRef = useRef<InstanceType<LL['Marker']>[]>([])
  const pinsRef = useRef<Client[]>([])
  const [dark, setDark] = useState(() => isDarkMode())
  const [attrOpen, setAttrOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pins, setPins] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const storeClients = useClientStore((s) => s.clients)
  const filteredForMap = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pins
    return pins.filter((c) => clientMatchesQuery(c, q) || c.address.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
  }, [pins, search])
  const searchResults = useMemo(() => filteredForMap.slice(0, 5), [filteredForMap])
  useEffect(() => { pinsRef.current = filteredForMap }, [filteredForMap])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const withCoords = storeClients.filter((c) => hasValidCoords(c.lat, c.lng))
      if (withCoords.length > 0) { if (!cancelled) { setPins(withCoords); setLoading(false) } try { const full = await fetchClients(); if (!cancelled) setPins(full.filter((c) => hasValidCoords(c.lat, c.lng))) } catch {} return }
      try { const full = await fetchClients(); if (!cancelled) setPins(full.filter((c) => hasValidCoords(c.lat, c.lng))) } catch { if (!cancelled) setPins([]) } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [storeClients])
  useMapDarkMode(useCallback((d: boolean) => setDark(d), []))
  useEffect(() => { layerRef.current?.setUrl(getTileUrl(dark), true) }, [dark])
  const updateClusters = useCallback(() => {
    const L = libRef.current
    const map = mapRef.current
    if (!L || !map) return
    const list = pinsRef.current
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    if (list.length === 0) return
    const zoom = (map as any).getZoom()
    if (zoom >= 14) {
      list.forEach((c) => {
        const m = (L as any).marker([c.lat as number, c.lng as number], { icon: (L as any).divIcon({ html: dotHtml(), className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(map)
        m.bindTooltip(c.shopName[0] || c.name[0] || c.id, { direction: 'top', offset: [0, -6] })
        m.on('click', () => setSelected(c))
        markersRef.current.push(m)
      })
      return
    }
    const gridSize = zoom <= 10 ? 80 : zoom <= 12 ? 60 : 50
    const groups = new Map<string, Client[]>()
    const bounds = (map as any).getBounds().pad(0.3)
    list.forEach((c) => {
      if (!bounds.contains([c.lat as number, c.lng as number])) return
      const pt = (map as any).latLngToContainerPoint([c.lat as number, c.lng as number])
      const key = `${Math.floor(pt.x / gridSize)}_${Math.floor(pt.y / gridSize)}`
      const arr = groups.get(key)
      if (arr) arr.push(c); else groups.set(key, [c])
    })
    if (groups.size === 0) {
      const fg = 0.15
      list.forEach((c) => {
        const key = `${Math.floor((c.lat as number) / fg)}_${Math.floor((c.lng as number) / fg)}`
        const arr = groups.get(key)
        if (arr) arr.push(c); else groups.set(key, [c])
      })
    }
    groups.forEach((g) => {
      if (g.length === 1) {
        const client = g[0]
        const m = (L as any).marker([client.lat as number, client.lng as number], { icon: (L as any).divIcon({ html: dotHtml(), className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(map)
        m.bindTooltip(client.shopName[0] || client.name[0] || client.id, { direction: 'top', offset: [0, -6] })
        m.on('click', () => setSelected(client))
        markersRef.current.push(m)
      } else {
        const count = g.length
        const size = count < 10 ? 34 : count < 25 ? 40 : 48
        const avgLat = g.reduce((s, c) => s + (c.lat as number), 0) / g.length
        const avgLng = g.reduce((s, c) => s + (c.lng as number), 0) / g.length
        const html = clusterHtml(count, size)
        const m = (L as any).marker([avgLat, avgLng], { icon: (L as any).divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }) }).addTo(map)
        m.on('click', () => { const b = (L as any).latLngBounds(g.map((c) => [c.lat as number, c.lng as number] as [number, number])); (map as any).fitBounds(b, { padding: [48, 48], maxZoom: 16 }) })
        m.bindTooltip(`${count} รายการ`, { direction: 'top', offset: [0, -10] })
        markersRef.current.push(m)
      }
    })
  }, [])
  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return
    let cancelled = false
    async function tryInit() {
      if (cancelled) return
      let L: LL
      try { L = await loadLeaflet() } catch { if (!cancelled) setFailed(true); return }
      if (cancelled || !L?.map || !containerRef.current) return
      libRef.current = L
      try {
        const map = L.map(containerRef.current!, {
          attributionControl: false,
          zoomControl: true,
          minZoom: KHON_KAEN_MIN_ZOOM,
          maxBounds: [[KHON_KAEN_BOUNDS[0][1], KHON_KAEN_BOUNDS[0][0]], [KHON_KAEN_BOUNDS[1][1], KHON_KAEN_BOUNDS[1][0]]] as any,
          maxBoundsViscosity: 1.0,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        }).setView([KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], 11)
        layerRef.current = L.tileLayer(getTileUrl(dark), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(map)
        mapRef.current = map as any
        let raf = 0
        const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => updateClusters()) }
        map.on('moveend zoomend', onMove)
        map.on('click', () => setSelected(null))
        setTimeout(() => { if (!cancelled) { map.invalidateSize(); updateClusters() } }, 100)
      } catch { if (!cancelled) setFailed(true) }
    }
    void tryInit()
    return () => { cancelled = true; try { (mapRef.current as any)?.remove() } catch {}; mapRef.current = null; libRef.current = null; layerRef.current = null; markersRef.current = [] }
  }, [updateClusters, dark])
  useEffect(() => { if (!mapRef.current || !libRef.current) return; updateClusters() }, [filteredForMap, updateClusters])
  useEffect(() => {
    if (!mapRef.current || !libRef.current) return
    if (pins.length === 0) return
    const map = mapRef.current as InstanceType<LL['Map']>
    const c = map.getCenter()
    const dist = Math.abs(c.lat - KHON_KAEN_CENTER[1]) + Math.abs(c.lng - KHON_KAEN_CENTER[0])
    const isDefaultView = dist < 0.01 && map.getZoom() === 11
    if (!isDefaultView) return
    if (pins.length === 1) map.setView([pins[0].lat as number, pins[0].lng as number], 14)
    else {
      const L = libRef.current as LL
      const b = (L as any).latLngBounds(pins.map((p) => [p.lat as number, p.lng as number] as [number, number]))
      try { (map as any).fitBounds(b, { padding: [24, 24], maxZoom: 14 }) } catch {}
    }
  }, [pins])
  if (failed) {
    return (
      <section className="mx-auto max-w-xl px-5 pb-8 pt-6 sm:px-6">
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapTrifold size={26} weight="duotone" />
          </div>
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Province · Khon Kaen</p>
            <h1 className="text-2xl font-semibold tracking-tight">แผนที่</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">ไม่สามารถโหลดแผนที่ได้</p>
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="mx-auto max-w-xl px-5 pb-8 pt-6 sm:px-6">
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MapTrifold size={26} weight="duotone" />
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Province · Khon Kaen</p>
          <h1 className="text-2xl font-semibold tracking-tight">แผนที่</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{loading ? 'กำลังโหลดหมุด…' : `${filteredForMap.length}${search ? ` / ${pins.length}` : ''} หมุด · ${search ? 'กรองอยู่' : 'ซูมออกเพื่อรวมกลุ่ม'}`}</p>
        </div>
      </div>
      <div className="relative mb-4">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setInputFocused(true)} onBlur={() => setTimeout(() => setInputFocused(false), 150)} placeholder="ค้นหาในแผนที่ — ชื่อ ร้าน ที่อยู่..." className="h-10 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm shadow-sm outline-none focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5" autoComplete="off" spellCheck={false} />
        {search ? (
          <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground" aria-label="ล้างค้นหา">
            <X className="h-3.5 w-3.5" weight="bold" />
          </button>
        ) : null}
        {inputFocused && search.trim() && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {searchResults.length > 0 ? (
              searchResults.map((c) => (
                <button key={c.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { setInputFocused(false); setSelected(c); (mapRef.current as any)?.setView([c.lat as number, c.lng as number], 15) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted">
                  {c.images[0] || c.thumb ? <AppImage src={c.thumb ?? c.images[0]} fallbackSrc={c.thumb ? c.images[0] : undefined} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover border border-black/10" /> : <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-xs">{(c.shopName[0] || c.name[0] || '·').trim().charAt(0).toUpperCase()}</div>}
                  <span className="min-w-0 flex-1"><ClientNames client={c} variant="list" titleClassName="text-sm leading-tight truncate" subClassName="text-xs truncate opacity-60" /></span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">ไม่พบ “{search}”</div>
            )}
            {filteredForMap.length > 5 && <div className="px-4 py-2 text-center font-mono text-[10px] text-muted-foreground">+ {filteredForMap.length - 5} รายการที่ซ่อน — พิมพ์ให้เจาะจงขึ้น</div>}
          </div>
        )}
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border" style={{ height: '62vh', minHeight: 360 }}>
        <div ref={containerRef} className="h-full w-full z-0" />
        <div className="absolute bottom-1 right-1 z-[400] flex items-center gap-1">
          {attrOpen && <span className="rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-none text-white backdrop-blur">{TILE_ATTRIBUTION}</span>}
          <button type="button" onClick={(e) => { e.stopPropagation(); setAttrOpen((v) => !v) }} aria-label={attrOpen ? 'ซ่อนเครดิต' : 'แสดงเครดิต'} className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur hover:bg-black/70">©</button>
        </div>
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"><span className="rounded-full bg-card px-4 py-2 text-xs shadow">กำลังโหลดแผนที่…</span></div>}
        {!loading && pins.length === 0 && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/80 p-6 text-center"><MapTrifold size={28} className="opacity-30" /><p className="text-sm font-medium">ยังไม่มีหมุด</p><p className="text-xs text-muted-foreground">เพิ่มพิกัดในหน้ารายการแล้วจะแสดงที่นี่</p><button onClick={() => navigate('/')} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">ไปหน้าหลัก</button></div>}
        {selected && (
          <div className="absolute bottom-3 left-3 right-3 z-20 animate-in fade-in slide-in-from-bottom-2">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-xl">
              <div className="flex gap-3">
                {selected.images[0] || selected.thumb ? <AppImage src={selected.thumb ?? selected.images[0]} fallbackSrc={selected.images[0]} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl object-cover border border-border" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground font-mono text-xs">{(selected.shopName[0] || selected.name[0] || '·').trim().charAt(0).toUpperCase()}</div>}
                <div className="min-w-0 flex-1">
                  <ClientNames client={selected} variant="list" titleClassName="text-sm font-medium leading-tight truncate" subClassName="text-xs truncate opacity-60" />
                  {selected.address && <p className="mt-0.5 truncate text-xs text-muted-foreground">{selected.address}</p>}
                  <p className="font-mono text-[10px] text-muted-foreground/60">{selected.lat?.toFixed(4)}, {selected.lng?.toFixed(4)}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} aria-label="ปิด" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"><X size={14} weight="bold" /></button>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => navigate(`/c/${selected.id}`)} className="flex-1 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground hover:opacity-90">ดูรายละเอียด →</button>
                <a href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full border border-border bg-card px-4 py-2.5 text-xs hover:bg-muted">Maps</a>
              </div>
            </div>
          </div>
        )}
      </div>
      {!loading && pins.length > 0 && <div className="mt-3 flex items-center gap-2 overflow-auto"><button onClick={() => (mapRef.current as any)?.setView([KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], 11)} className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">ทั้งจังหวัด</button><span className="font-mono text-[10px] text-muted-foreground">· ขอนแก่น · ไทยล้วน · รวมกลุ่มอัตโนมัติ</span></div>}
    </section>
  )
}
