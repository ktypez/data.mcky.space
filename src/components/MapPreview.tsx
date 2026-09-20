import { useEffect, useRef, useState, useCallback } from 'react'
import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_BOUNDS, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'

type LL = typeof import('leaflet')
async function loadLeaflet(): Promise<LL> {
  const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  return (mod.default ?? mod) as LL
}

export interface MapPreviewProps { lat: number; lng: number }

export default function MapPreview({ lat, lng }: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<LL['Map']> | null>(null)
  const layerRef = useRef<InstanceType<LL['TileLayer']> | null>(null)
  const libRef = useRef<LL | null>(null)
  const markerRef = useRef<InstanceType<LL['Marker']> | null>(null)
  const [failed, setFailed] = useState(false)
  const [dark, setDark] = useState(() => isDarkMode())
  const [attrOpen, setAttrOpen] = useState(false)
  const latRef = useRef(lat)
  const lngRef = useRef(lng)
  useEffect(() => { latRef.current = lat; lngRef.current = lng }, [lat, lng])
  useMapDarkMode(useCallback((d: boolean) => setDark(d), []))
  useEffect(() => { layerRef.current?.setUrl(getTileUrl(dark), true) }, [dark])
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
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
          minZoom: KHON_KAEN_MIN_ZOOM,
          maxBounds: [[KHON_KAEN_BOUNDS[0][1], KHON_KAEN_BOUNDS[0][0]], [KHON_KAEN_BOUNDS[1][1], KHON_KAEN_BOUNDS[1][0]]] as any,
          maxBoundsViscosity: 1.0,
        }).setView([latRef.current, lngRef.current], 15)
        layerRef.current = L.tileLayer(getTileUrl(dark), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(map)
        const dot = document.createElement('div')
        dot.className = 'w-3 h-3 rounded-full bg-primary border-2 border-card shadow-sm'
        markerRef.current = (L as any).marker([latRef.current, lngRef.current], { icon: (L as any).divIcon({ html: dot, className: '', iconSize: [12, 12], iconAnchor: [6, 6] }), interactive: false }).addTo(map)
        mapRef.current = map as any
      } catch { if (!cancelled) setFailed(true) }
    }
    void tryInit()
    return () => { cancelled = true; try { mapRef.current?.remove() } catch {}; mapRef.current = null; markerRef.current = null; libRef.current = null; layerRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapRef.current) return
    const m = mapRef.current as InstanceType<LL['Map']>
    m.flyTo([lat, lng], 15, { duration: 0.5 } as any)
    if (markerRef.current) markerRef.current.remove()
    const L = libRef.current as LL
    if (!L) return
    const dot = document.createElement('div')
    dot.className = 'w-3 h-3 rounded-full bg-primary border-2 border-card shadow-sm'
    markerRef.current = (L as any).marker([lat, lng], { icon: (L as any).divIcon({ html: dot, className: '', iconSize: [12, 12], iconAnchor: [6, 6] }), interactive: false }).addTo(m)
  }, [lat, lng])
  if (failed) {
    return <div className="relative flex h-full w-full items-center justify-center bg-muted font-mono text-xs text-muted-foreground" style={{ minHeight: 160 }}>{lat.toFixed(6)}, {lng.toFixed(6)}</div>
  }
  return (
    <div ref={outerRef} className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full z-0" style={{ minHeight: 160 }} />
      <div className="absolute bottom-1 right-1 z-10 flex items-center gap-1">
        <span className={`rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-none text-white backdrop-blur ${attrOpen ? '' : 'hidden'}`}>{TILE_ATTRIBUTION}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); setAttrOpen((v) => !v) }} aria-label={attrOpen ? 'ซ่อนเครดิต' : 'แสดงเครดิต'} className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur hover:bg-black/70">©</button>
      </div>
    </div>
  )
}
