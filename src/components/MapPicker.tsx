import { useEffect, useRef, useCallback, useState } from 'react'
import { OpenLocationCode } from 'open-location-code'
import { pinHtml } from '@/lib/pin'
import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_CENTER, KHON_KAEN_BOUNDS, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
import { cssVarToHex } from '@/lib/utils'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'

type LL = typeof import('leaflet')
async function loadLeaflet(): Promise<LL> {
  const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  return (mod.default ?? mod) as LL
}
let olcInstance: OpenLocationCode | null = null
function getOlc(): OpenLocationCode { if (!olcInstance) olcInstance = new OpenLocationCode(); return olcInstance }
function getPinColor(): string { return cssVarToHex('--pin-color', '#2563eb') }
const PIN_ZOOM = 16
const PROVINCE_ZOOM = 11
export interface MapPickerProps { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void }
export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<LL['Map']> | null>(null)
  const layerRef = useRef<InstanceType<LL['TileLayer']> | null>(null)
  const markerRef = useRef<InstanceType<LL['Marker']> | null>(null)
  const libRef = useRef<LL | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const [dark, setDark] = useState(() => isDarkMode())
  const [attrOpen, setAttrOpen] = useState(false)
  const initializedRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const latRef = useRef(lat)
  const lngRef = useRef(lng)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { latRef.current = lat; lngRef.current = lng }, [lat, lng])
  const placeMarker = useCallback((mlat: number, mlng: number) => {
    const L = libRef.current
    const map = mapRef.current
    if (!L || !map) return
    if (markerRef.current) markerRef.current.remove()
    const el = document.createElement('div')
    el.innerHTML = pinHtml(28, true, getPinColor())
    markerRef.current = (L as any).marker([mlat, mlng], { icon: (L as any).divIcon({ html: el, className: '', iconSize: [28, 28], iconAnchor: [14, 25] }) }).addTo(map)
  }, [])
  useMapDarkMode(useCallback((d: boolean) => setDark(d), []))
  useEffect(() => { layerRef.current?.setUrl(getTileUrl(dark), true) }, [dark])
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return
    let cancelled = false
    async function tryInit() {
      if (cancelled) return
      let L: LL
      try { L = await loadLeaflet() } catch { if (!cancelled) setMapFailed(true); return }
      if (cancelled || !L?.map || !containerRef.current) return
      libRef.current = L
      try {
        const hasPos = lngRef.current != null && latRef.current != null
        const map = L.map(containerRef.current!, {
          attributionControl: false,
          minZoom: KHON_KAEN_MIN_ZOOM,
          maxBounds: [[KHON_KAEN_BOUNDS[0][1], KHON_KAEN_BOUNDS[0][0]], [KHON_KAEN_BOUNDS[1][1], KHON_KAEN_BOUNDS[1][0]]] as any,
          maxBoundsViscosity: 1.0,
        }).setView(hasPos ? [latRef.current as number, lngRef.current as number] : [KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], hasPos ? PIN_ZOOM : PROVINCE_ZOOM)
        layerRef.current = L.tileLayer(getTileUrl(dark), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(map)
        map.on('click', (e: any) => {
          const { lat: mlat, lng: mlng } = e.latlng
          onChangeRef.current(mlat, mlng)
          map.flyTo([mlat, mlng], Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.6 } as any)
          placeMarker(mlat, mlng)
        })
        if (latRef.current != null && lngRef.current != null) { initializedRef.current = true; placeMarker(latRef.current, lngRef.current) }
        mapRef.current = map as any
        setTimeout(() => { if (!cancelled) map.invalidateSize() }, 100)
      } catch { if (!cancelled) setMapFailed(true) }
    }
    void tryInit()
    return () => { cancelled = true; try { mapRef.current?.remove() } catch {}; mapRef.current = null; libRef.current = null; layerRef.current = null; markerRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const map = mapRef.current
    if (!map || lat == null || lng == null) return
    if (!initializedRef.current) {
      initializedRef.current = true
      if (lat !== KHON_KAEN_CENTER[1] || lng !== KHON_KAEN_CENTER[0]) (map as any).flyTo([lat, lng], PIN_ZOOM, { duration: 0.6 } as any)
      if (!markerRef.current) placeMarker(lat, lng)
      return
    }
    if (markerRef.current) (markerRef.current as any).setLatLng([lat, lng]); else placeMarker(lat, lng)
    ;(map as any).flyTo([lat, lng], Math.max((map as any).getZoom(), PIN_ZOOM), { duration: 0.6 } as any)
  }, [lat, lng, placeMarker])
  if (mapFailed) return <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center text-muted-foreground text-xs">ไม่สามารถโหลดแผนที่ได้</div>
  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-border relative">
      <div ref={containerRef} className="w-full h-full z-0" />
      {lat != null && lng != null && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[13px] font-mono text-foreground whitespace-nowrap pointer-events-none flex items-center gap-1.5">
          <span className="text-foreground/90">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
          <span className="text-foreground/30">|</span>
          <span className="text-success font-bold tracking-wider">{getOlc().encode(lat, lng, 10)}</span>
        </div>
      )}
      <div className="absolute bottom-1 right-1 z-10 flex items-center gap-1">
        <span className={`rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-none text-white backdrop-blur ${attrOpen ? '' : 'hidden'}`}>{TILE_ATTRIBUTION}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); setAttrOpen((v) => !v) }} aria-label={attrOpen ? 'ซ่อนเครดิต' : 'แสดงเครดิต'} className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur hover:bg-black/70">©</button>
      </div>
    </div>
  )
}
