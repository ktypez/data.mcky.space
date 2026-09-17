import { useEffect, useRef, useState, useCallback } from 'react'
import { getMapFlavor, tileUrl, TILE_ATTRIBUTION, type MapFlavor } from '@/lib/map-styles'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'

// Leaflet is dynamically imported (shared `leaflet` chunk) so the catalog
// never downloads it — the chunk loads only when this preview scrolls near.
type LL = typeof import('leaflet')

async function loadLeaflet(): Promise<LL> {
  const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  return (mod.default ?? mod) as LL
}

export interface MapPreviewProps {
  lat: number
  lng: number
}

/** Lightweight read-only preview: Leaflet with dragging/zoom off, tile
    flavor following the app theme (auto dark). Mounts only when scrolled
    near the viewport. */
export default function MapPreview({ lat, lng }: MapPreviewProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<LL['Map']> | null>(null)
  const layerRef = useRef<InstanceType<LL['TileLayer']> | null>(null)
  const libRef = useRef<LL | null>(null)
  const [near, setNear] = useState(false)
  const [failed, setFailed] = useState(false)
  const latRef = useRef(lat)
  const lngRef = useRef(lng)
  useEffect(() => { latRef.current = lat; lngRef.current = lng }, [lat, lng])

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const setFlavor = useCallback((flavor: MapFlavor) => {
    const L = libRef.current
    const map = mapRef.current
    if (!L || !map) return
    layerRef.current?.remove()
    layerRef.current = L.tileLayer(tileUrl(flavor), { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map)
  }, [])

  useEffect(() => {
    if (!near || !containerRef.current || mapRef.current) return
    let cancelled = false
    async function tryInit() {
      let L: LL
      try {
        L = await loadLeaflet()
      } catch {
        if (!cancelled) setFailed(true)
        return
      }
      if (cancelled || !L?.map || !containerRef.current) return
      libRef.current = L
      try {
        const map = L.map(containerRef.current, {
          attributionControl: false,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
        }).setView([latRef.current, lngRef.current], 15)
        layerRef.current = L.tileLayer(tileUrl(getMapFlavor()), { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map)
        const dot = document.createElement('div')
        dot.className = 'w-3 h-3 rounded-full bg-primary border-2 border-card shadow-sm'
        L.marker([latRef.current, lngRef.current], {
          icon: L.divIcon({ html: dot, className: '', iconSize: [12, 12], iconAnchor: [6, 6] }),
          interactive: false,
          keyboard: false,
        }).addTo(map)
        mapRef.current = map
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void tryInit()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [near])

  useMapDarkMode(useCallback((flavor: MapFlavor) => setFlavor(flavor), [setFlavor]))

  if (!near) {
    return (
      <div ref={outerRef} className="h-full w-full">
        <div className="flex h-full w-full items-center justify-center bg-muted font-mono text-xs text-muted-foreground" style={{ minHeight: 160 }}>
          Loading map...
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <div ref={outerRef} className="flex h-full w-full items-center justify-center bg-muted font-mono text-xs text-muted-foreground">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    )
  }

  return (
    <div ref={outerRef} className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full z-0" />
      <span className="absolute bottom-1 right-2 z-10 font-mono text-[9px] text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
        {TILE_ATTRIBUTION}
      </span>
    </div>
  )
}
