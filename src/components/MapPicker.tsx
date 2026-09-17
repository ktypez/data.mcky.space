import { useEffect, useRef, useCallback, useState } from 'react'
import { OpenLocationCode } from 'open-location-code'
import { pinHtml } from '@/lib/pin'
import { getMapFlavor, tileUrl, TILE_ATTRIBUTION, type MapFlavor } from '@/lib/map-styles'
import { cssVarToHex, DEFAULT_MAP_CENTER } from '@/lib/utils'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'

// SECURITY: pinHtml() outputs raw HTML into DOM via innerHTML (Leaflet divIcon).
// All inputs (size, selected, color) are controlled constants — never user-derived.
// If pinHtml ever accepts user strings, sanitize them first.

// Leaflet is dynamically imported (shared `leaflet` chunk) so pages without
// a map never download it.
type LL = typeof import('leaflet')

async function loadLeaflet(): Promise<LL> {
  const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
  return (mod.default ?? mod) as LL
}

let olcInstance: OpenLocationCode | null = null
function getOlc(): OpenLocationCode {
  if (!olcInstance) olcInstance = new OpenLocationCode()
  return olcInstance
}

function getPinColor(): string {
  return cssVarToHex('--pin-color', '#2563eb')
}

const DEFAULT_ZOOM = 8
const PIN_ZOOM = 16

export interface MapPickerProps {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

type Props = MapPickerProps

export default function MapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<LL['Map']> | null>(null)
  const layerRef = useRef<InstanceType<LL['TileLayer']> | null>(null)
  const markerRef = useRef<InstanceType<LL['Marker']> | null>(null)
  const libRef = useRef<LL | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const initializedRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const latRef = useRef(lat)
  const lngRef = useRef(lng)

  useEffect(() => { onChangeRef.current = onChange })
  useEffect(() => { latRef.current = lat; lngRef.current = lng }, [lat, lng])

  const placeMarker = useCallback((mlat: number, mlng: number) => {
    const L = libRef.current
    const map = mapRef.current
    if (!L || !map) return
    markerRef.current?.remove()
    const el = document.createElement('div')
    el.innerHTML = pinHtml(28, true, getPinColor())
    markerRef.current = L.marker([mlat, mlng], {
      icon: L.divIcon({ html: el, className: '', iconSize: [28, 28], iconAnchor: [14, 25] }),
    }).addTo(map)
  }, [])

  const setFlavor = useCallback((flavor: MapFlavor) => {
    const L = libRef.current
    const map = mapRef.current
    if (!L || !map) return
    layerRef.current?.remove()
    layerRef.current = L.tileLayer(tileUrl(flavor), { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map)
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const container = containerRef.current
    let cancelled = false

    async function tryInit() {
      if (cancelled) return
      let L: LL
      try {
        L = await loadLeaflet()
      } catch (err) {
        if (!cancelled) {
          console.error('[MapPicker] leaflet import failed')
          setMapFailed(true)
        }
        return
      }
      if (cancelled || !L?.map) {
        if (!cancelled) setMapFailed(true)
        return
      }
      libRef.current = L

      let map: InstanceType<LL['Map']>
      try {
        const hasPos = lngRef.current != null && latRef.current != null
        map = L.map(container, { attributionControl: false }).setView(
          hasPos ? [latRef.current as number, lngRef.current as number] : [DEFAULT_MAP_CENTER[1], DEFAULT_MAP_CENTER[0]],
          hasPos ? PIN_ZOOM : DEFAULT_ZOOM,
        )
        layerRef.current = L.tileLayer(tileUrl(getMapFlavor()), { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map)
      } catch (err) {
        console.error('MapPicker init failed')
        setMapFailed(true)
        return
      }

      map.on('click', (e: { latlng: InstanceType<LL['LatLng']> }) => {
        const { lat: mlat, lng: mlng } = e.latlng
        onChangeRef.current(mlat, mlng)
        map.flyTo([mlat, mlng], Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.6 })
        placeMarker(mlat, mlng)
      })

      // Add initial marker if position provided
      if (latRef.current != null && lngRef.current != null) {
        initializedRef.current = true
        placeMarker(latRef.current, lngRef.current)
      }

      mapRef.current = map
      // Fix sizing when the editor animates open.
      setTimeout(() => { if (!cancelled) map.invalidateSize() }, 100)
    }

    void tryInit()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
      markerRef.current = null
    }
  }, [placeMarker])

  useMapDarkMode(useCallback((flavor: MapFlavor) => setFlavor(flavor), [setFlavor]))

  // Update marker and fly when lat/lng change externally
  useEffect(() => {
    const map = mapRef.current
    if (!map || lat == null || lng == null) return

    if (!initializedRef.current) {
      initializedRef.current = true
      if (lat !== DEFAULT_MAP_CENTER[1] || lng !== DEFAULT_MAP_CENTER[0]) {
        map.flyTo([lat, lng], PIN_ZOOM, { duration: 0.6 })
      }
      if (!markerRef.current) placeMarker(lat, lng)
      return
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      placeMarker(lat, lng)
    }

    map.flyTo([lat, lng], Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.6 })
  }, [lat, lng, placeMarker])

  if (mapFailed) {
    return (
      <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center text-muted-foreground text-xs">
        ไม่สามารถโหลดแผนที่ได้
      </div>
    )
  }

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-border relative">
      <div ref={containerRef} className="w-full h-full z-0" />
      {lat != null && lng != null && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[13px] font-mono text-foreground whitespace-nowrap pointer-events-none flex items-center gap-1.5">
          <span className="text-foreground/90">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
          <span className="text-foreground/30">|</span>
          <span className="text-success font-bold tracking-wider">
            {getOlc().encode(lat, lng, 10)}
          </span>
        </div>
      )}
    </div>
  )
}
