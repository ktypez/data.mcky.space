import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapTrifold, X, MagnifyingGlass } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_CENTER, KHON_KAEN_BOUNDS, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'
import { hasValidCoords } from '@/lib/utils'
import { fetchClientMap } from '@/lib/storage'
import { clientMatchesQuery } from '@/lib/clientNames'
import { safeTooltipContent } from '@/lib/leaflet-content'
import type { Client } from '@/types/index'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'

type LL = typeof import('leaflet')
async function loadLeaflet(): Promise<LL> { const [m] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]); return (m.default ?? m) as LL }
function clusterHtml(count: number, size: number): string { return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:var(--primary);color:var(--primary-foreground);display:flex;align-items:center;justify-content:center;font-size:${size > 40 ? 13 : 12}px;font-weight:700;border:2px solid var(--card);box-shadow:0 2px 8px rgba(0,0,0,0.25);">${count}</div>` }
function dotHtml(): string { return `<div style="width:12px;height:12px;border-radius:999px;background:var(--primary);border:2px solid var(--card);box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>` }

export default function MapsPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<LL['Map']> | null>(null)
  const layerRef = useRef<InstanceType<LL['TileLayer']> | null>(null)
  const libRef = useRef<LL | null>(null)
  const markersRef = useRef<InstanceType<LL['Marker']>[]>([])
  const pinsRef = useRef<Client[]>([])
  const [dark, setDark] = useState(() => isDarkMode())
  const darkRef = useRef(dark)
  const [attrOpen, setAttrOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pins, setPins] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const storeClients = useClientStore(s => s.clients)

  useEffect(() => { darkRef.current = dark }, [dark])

  const filteredForMap = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pins
    return pins.filter(c => clientMatchesQuery(c, q) || c.address.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
  }, [pins, search])
  const searchResults = useMemo(() => filteredForMap.slice(0, 5), [filteredForMap])
  useEffect(() => { pinsRef.current = filteredForMap }, [filteredForMap])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      const withCoords = storeClients.filter(c => hasValidCoords(c.lat, c.lng))
      if (withCoords.length > 0 && !cancelled) {
        setPins(withCoords)
        setLoading(false)
      }
      try {
        const full = await fetchClientMap()
        if (!cancelled) {
          setPins(full.filter(c => hasValidCoords(c.lat, c.lng)))
          if (typeof navigator !== 'undefined' && !navigator.onLine) setLoadError('ออฟไลน์ — กำลังใช้ข้อมูลแผนที่ที่บันทึกไว้')
        }
      } catch {
        if (!cancelled) setLoadError('โหลดข้อมูลแผนที่ไม่สำเร็จ — กำลังใช้ข้อมูลที่มีอยู่')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [storeClients, reloadKey])

  useMapDarkMode(useCallback((nextDark: boolean) => setDark(nextDark), []))
  useEffect(() => { layerRef.current?.setUrl(getTileUrl(dark), true) }, [dark])

  const updateClusters = useCallback(() => {
    const L = libRef.current
    const map = mapRef.current
    if (!L || !map) return
    const list = pinsRef.current
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    if (list.length === 0) return

    const bounds = map.getBounds().pad(0.35)
    const visible = list.filter(client => bounds.contains([client.lat as number, client.lng as number]))
    if (visible.length === 0) return
    const zoom = map.getZoom()
    const addTooltip = (marker: InstanceType<LL['Marker']>, value: string) => {
      marker.bindTooltip(safeTooltipContent(value), { direction: 'top', offset: [0, -6] })
    }

    if (zoom >= 17) {
      visible.forEach(client => {
        const marker = L.marker([client.lat as number, client.lng as number], { icon: L.divIcon({ html: dotHtml(), className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(map)
        addTooltip(marker, client.shopName[0] || client.name[0] || client.id)
        marker.on('click', () => setSelected(client))
        markersRef.current.push(marker)
      })
      return
    }

    const gridSize = zoom <= 10 ? 80 : zoom <= 12 ? 60 : 50
    const groups = new Map<string, Client[]>()
    visible.forEach(client => {
      const point = map.latLngToContainerPoint([client.lat as number, client.lng as number])
      const key = `${Math.floor(point.x / gridSize)}_${Math.floor(point.y / gridSize)}`
      const group = groups.get(key)
      if (group) group.push(client)
      else groups.set(key, [client])
    })

    groups.forEach(group => {
      if (group.length === 1) {
        const client = group[0]
        const marker = L.marker([client.lat as number, client.lng as number], { icon: L.divIcon({ html: dotHtml(), className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(map)
        addTooltip(marker, client.shopName[0] || client.name[0] || client.id)
        marker.on('click', () => setSelected(client))
        markersRef.current.push(marker)
        return
      }

      const count = group.length
      const size = count < 10 ? 34 : count < 25 ? 40 : 48
      const avgLat = group.reduce((sum, client) => sum + (client.lat as number), 0) / group.length
      const avgLng = group.reduce((sum, client) => sum + (client.lng as number), 0) / group.length
      const marker = L.marker([avgLat, avgLng], { icon: L.divIcon({ html: clusterHtml(count, size), className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }) }).addTo(map)
      marker.on('click', () => {
        const clusterBounds = L.latLngBounds(group.map(client => [client.lat as number, client.lng as number] as [number, number]))
        map.fitBounds(clusterBounds, { padding: [48, 48], maxZoom: 16 })
      })
      addTooltip(marker, `${count} รายการ`)
      markersRef.current.push(marker)
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return
    let cancelled = false
    let raf = 0
    let initTimer: ReturnType<typeof setTimeout> | undefined
    let resizeObserver: ResizeObserver | undefined

    const init = async () => {
      if (cancelled) return
      let L: LL
      try { L = await loadLeaflet() } catch { if (!cancelled) setFailed(true); return }
      if (cancelled || !L?.map || !containerRef.current) return
      libRef.current = L
      try {
        const map = L.map(containerRef.current, {
          attributionControl: false,
          zoomControl: true,
          minZoom: KHON_KAEN_MIN_ZOOM,
          maxBounds: [[KHON_KAEN_BOUNDS[0][1], KHON_KAEN_BOUNDS[0][0]], [KHON_KAEN_BOUNDS[1][1], KHON_KAEN_BOUNDS[1][0]]] as [ [number, number], [number, number] ],
          maxBoundsViscosity: 1,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        }).setView([KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], 11)
        layerRef.current = L.tileLayer(getTileUrl(darkRef.current), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(map)
        mapRef.current = map
        const onMove = () => {
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(() => updateClusters())
        }
        map.on('moveend zoomend', onMove)
        map.on('click', () => setSelected(null))
        map.on('tileerror', () => { if (!cancelled) setLoadError('โหลดผืนแผนที่บางส่วนไม่สำเร็จ') })
        resizeObserver = new ResizeObserver(() => {
          if (cancelled) return
          map.invalidateSize({ pan: false })
          updateClusters()
        })
        resizeObserver.observe(el)
        initTimer = setTimeout(() => {
          if (!cancelled) {
            map.invalidateSize()
            updateClusters()
          }
        }, 100)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void init()

    return () => {
      cancelled = true
      if (initTimer) clearTimeout(initTimer)
      resizeObserver?.disconnect()
      cancelAnimationFrame(raf)
      try { mapRef.current?.remove() } catch { /* map may already be detached */ }
      mapRef.current = null
      libRef.current = null
      layerRef.current = null
      markersRef.current = []
    }
  }, [updateClusters])

  useEffect(() => {
    if (mapRef.current && libRef.current) updateClusters()
  }, [filteredForMap, updateClusters])

  useEffect(() => {
    if (!mapRef.current || pins.length === 0) return
    const map = mapRef.current
    const center = map.getCenter()
    const distance = Math.abs(center.lat - KHON_KAEN_CENTER[1]) + Math.abs(center.lng - KHON_KAEN_CENTER[0])
    if (distance >= 0.01 || map.getZoom() !== 11) return
    if (pins.length === 1) {
      map.setView([pins[0].lat as number, pins[0].lng as number], 14)
    } else {
      const L = libRef.current
      if (!L) return
      const bounds = L.latLngBounds(pins.map(pin => [pin.lat as number, pin.lng as number] as [number, number]))
      try { map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 }) } catch { /* ignore an empty bounds object */ }
    }
  }, [pins])

  if (failed) {
    return <section className="mx-auto flex h-full max-w-xl items-center justify-center px-5 pb-4 pt-6 sm:px-6"><p className="text-sm text-muted-foreground">ไม่สามารถโหลดแผนที่ได้</p></section>
  }

  return (
    <section className="mx-auto flex h-full max-w-xl flex-col overflow-hidden px-5 pb-4 pt-6 sm:px-6">
      <h1 className="sr-only">แผนที่รายการลูกค้า</h1>
      {loadError && <div className="mb-4 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm" role="status"><span>{loadError}</span><button type="button" onClick={() => setReloadKey(value => value + 1)} className="min-h-11 shrink-0 rounded-full border border-border px-3 text-xs hover:bg-muted">ลองใหม่</button></div>}

      <div className="relative mb-4 shrink-0">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" aria-hidden />
        <input value={search} onChange={event => setSearch(event.target.value)} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} placeholder="ค้นหาในแผนที่ — ชื่อ ร้าน ที่อยู่…" aria-label="ค้นหาในแผนที่" className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm shadow-sm outline-none focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5" autoComplete="off" spellCheck={false} />
        {search && <button type="button" onClick={() => setSearch('')} className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground" aria-label="ล้างการค้นหา"><X className="h-3.5 w-3.5" weight="bold" aria-hidden /></button>}
        {inputFocused && search.trim() && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {searchResults.length > 0 ? searchResults.map(client => (
              <button key={client.id} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setInputFocused(false); setSelected(client); mapRef.current?.setView([client.lat as number, client.lng as number], 15) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted">
                {client.images[0] || client.thumb ? <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover border border-border" /> : <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-xs">{(client.shopName[0] || client.name[0] || '·').trim().charAt(0).toUpperCase()}</div>}
                <span className="min-w-0 flex-1"><ClientNames client={client} variant="list" titleClassName="text-sm leading-tight truncate" subClassName="text-xs truncate opacity-60" /></span>
              </button>
            )) : <div className="px-4 py-6 text-center text-sm text-muted-foreground">ไม่พบ “{search}”</div>}
            {filteredForMap.length > 5 && <div className="px-4 py-2 text-center font-mono text-[10px] text-muted-foreground">+ {filteredForMap.length - 5} รายการที่ซ่อน — พิมพ์ให้เจาะจงขึ้น</div>}
          </div>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border">
        <div ref={containerRef} className="h-full w-full z-0" />
        <div className="absolute bottom-1 right-1 z-[400] flex items-center gap-1">
          {attrOpen && <span className="rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-none text-white backdrop-blur">{TILE_ATTRIBUTION}</span>}
          <button type="button" onClick={event => { event.stopPropagation(); setAttrOpen(value => !value) }} aria-label={attrOpen ? 'ซ่อนเครดิต' : 'แสดงเครดิต'} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur hover:bg-black/70">©</button>
        </div>
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"><span className="rounded-full bg-card px-4 py-2 text-xs shadow" role="status">กำลังโหลดแผนที่…</span></div>}
        {!loading && pins.length === 0 && !loadError && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/80 p-6 text-center"><MapTrifold size={28} className="opacity-30" aria-hidden /><p className="text-sm font-medium">ยังไม่มีหมุด</p><p className="text-xs text-muted-foreground">เพิ่มพิกัดในหน้ารายการ แล้วจะแสดงที่นี่</p><button type="button" onClick={() => navigate('/')} className="mt-2 min-h-11 rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">ไปหน้าหลัก</button></div>}
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
                <button type="button" onClick={() => setSelected(null)} aria-label="ปิดรายละเอียดบนแผนที่" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"><X size={14} weight="bold" aria-hidden /></button>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => navigate(`/c/${encodeURIComponent(selected.id)}`)} className="min-h-11 flex-1 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground hover:opacity-90">ดูรายละเอียด →</button>
                <a href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 py-2.5 text-xs hover:bg-muted">Google Maps</a>
              </div>
            </div>
          </div>
        )}
      </div>
      {!loading && pins.length > 0 && <div className="mt-3 flex shrink-0 items-center gap-2 overflow-auto"><button type="button" onClick={() => mapRef.current?.setView([KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], 11)} className="min-h-11 shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">ทั้งจังหวัด</button><span className="font-mono text-[10px] text-muted-foreground">· ขอนแก่น · ไทยล้วน · รวมกลุ่มอัตโนมัติ</span></div>}
    </section>
  )
}
