'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Client } from '@/types'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { X, NavigationArrow, MapPin, Crosshair, User } from '@phosphor-icons/react'
import { getMapStyle } from '@/lib/map-styles'
import { cssVarToHex } from '@/lib/utils'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const SOURCE_ID = 'clients'
const CLUSTER_LAYER = 'clusters'
const CLUSTER_COUNT_LAYER = 'cluster-count'
const POINT_LAYER = 'points'
const HIGHLIGHT_LAYER = 'point-highlight'

// MapLibre GL parseCssColor() only supports hex/rgb/hsl — not var() or oklch()
// Use cssVarToHex() to get the computed hex of the current foreground/background
function getPinColor(): string {
  return cssVarToHex('--pin-color', '#2e2e2e')
}

function getStrokeColor(): string {
  return cssVarToHex('--card', '#ffffff')
}

interface Props {
 clients: Client[]
 focusClientId?: string | null
 onSelectClient?: (client: Client) => void
}

function buildGeoJSON(clients: Client[]): GeoJSON.FeatureCollection {
 return {
 type: 'FeatureCollection',
 features: clients
  .filter((c) => c.lat != null && c.lng != null && !Number.isNaN(c.lat) && !Number.isNaN(c.lng))
 .map((c) => ({
 type: 'Feature',
 geometry: { type: 'Point', coordinates: [c.lng!, c.lat!] },
 properties: { id: c.id },
 })),
 }
}

export default function InlineMap({ clients, focusClientId, onSelectClient }: Props) {
 const mapRef = useRef<HTMLDivElement>(null)
 const mapInstanceRef = useRef<maplibregl.Map | null>(null)
 const clientsRef = useRef(clients)
 const [selectedPin, setSelectedPin] = useState<Client | null>(null)
 const [directionTarget, setDirectionTarget] = useState<{
 id: string
 name: string
 lat: number
 lng: number
 } | null>(null)
  const layersAddedRef = useRef(false)

  useEffect(() => {
 clientsRef.current = clients
 }, [clients])

 // Init map
 useEffect(() => {
 if (!mapRef.current || mapInstanceRef.current) return

 const map = new maplibregl.Map({
 container: mapRef.current,
 style: getMapStyle(),
 center: [102.8236, 16.4322],
 zoom: 6,
 attributionControl: false,
 })

 map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
 mapInstanceRef.current = map

 let listenersAdded = false
 let initialFitDone = false

 function addLayers() {
 for (const id of [HIGHLIGHT_LAYER, POINT_LAYER, CLUSTER_COUNT_LAYER, CLUSTER_LAYER]) {
 if (map.getLayer(id)) map.removeLayer(id)
 }
 if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)

 map.addSource(SOURCE_ID, {
 type: 'geojson',
 data: buildGeoJSON(clientsRef.current),
 cluster: true,
 clusterMaxZoom: 14,
 clusterRadius: 50,
 })

 map.addLayer({
 id: CLUSTER_LAYER,
 type: 'circle',
 source: SOURCE_ID,
 filter: ['has', 'point_count'],
 paint: {
 'circle-color': getPinColor(),
 'circle-radius': ['step', ['get', 'point_count'], 20, 10, 26, 30, 34],
 'circle-opacity': 0.85,
 'circle-stroke-width': 3,
  'circle-stroke-color': getStrokeColor(),
  },
  })

  map.addLayer({
   id: CLUSTER_COUNT_LAYER,
   type: 'symbol',
   source: SOURCE_ID,
   filter: ['has', 'point_count'],
   layout: {
   'text-field': ['get', 'point_count_abbreviated'],
   'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
   'text-size': 13,
   },
   paint: {
   'text-color': getStrokeColor(),
   },
  })

  map.addLayer({
   id: POINT_LAYER,
   type: 'circle',
   source: SOURCE_ID,
   filter: ['!', ['has', 'point_count']],
   paint: {
   'circle-color': getPinColor(),
   'circle-radius': 6,
   'circle-stroke-width': 2.5,
   'circle-stroke-color': getStrokeColor(),
 },
 })

 map.addLayer({
 id: HIGHLIGHT_LAYER,
 type: 'circle',
 source: SOURCE_ID,
 filter: ['==', 'id', ''],
  paint: {
   'circle-color': getPinColor(),
   'circle-radius': 12,
   'circle-stroke-width': 4,
   'circle-stroke-color': getStrokeColor(),
 'circle-opacity': 0.9,
 },
 })

 layersAddedRef.current = true

 // Fit bounds on first load only
 if (!initialFitDone) {
 initialFitDone = true
 const data = buildGeoJSON(clientsRef.current)
 if (data.features.length > 0) {
 const bounds = new maplibregl.LngLatBounds()
 data.features.forEach((f) => {
 const coords = (f.geometry as GeoJSON.Point).coordinates
 bounds.extend(coords as [number, number])
 })
 map.fitBounds(bounds, { padding: 50, maxZoom: 15 })
 }
 }
 }

 function setupListeners() {
 if (listenersAdded) return
 listenersAdded = true

 // Cluster click → zoom in
 map.on('click', CLUSTER_LAYER, (e) => {
 const feature = e.features?.[0]
 if (!feature) return
 const coords = (feature.geometry as GeoJSON.Point).coordinates
 const zoom = map.getZoom() + 2
 map.flyTo({ center: coords as [number, number], zoom, duration: 600 })
 })

 // Point click → open drawer
 function onPointClick(
 e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
 ) {
 const feature = e.features?.[0]
 if (!feature || !feature.properties) return
 const id = feature.properties.id as string
 const client = clientsRef.current.find((c) => c.id === id)
 if (client) {
 setSelectedPin(client)
 try {
 map.setFilter(HIGHLIGHT_LAYER, ['==', 'id', id])
 } catch {}
 }
 }
 map.on('click', POINT_LAYER, onPointClick)
 map.on('click', HIGHLIGHT_LAYER, onPointClick)

 // Cursor change
 map.on('mouseenter', CLUSTER_LAYER, () => (map.getCanvas().style.cursor = 'pointer'))
 map.on('mouseleave', CLUSTER_LAYER, () => (map.getCanvas().style.cursor = ''))
 map.on('mouseenter', POINT_LAYER, () => (map.getCanvas().style.cursor = 'pointer'))
 map.on('mouseleave', POINT_LAYER, () => (map.getCanvas().style.cursor = ''))
 map.on('mouseenter', HIGHLIGHT_LAYER, () => (map.getCanvas().style.cursor = 'pointer'))
 map.on('mouseleave', HIGHLIGHT_LAYER, () => (map.getCanvas().style.cursor = ''))
 }

  map.on('style.load', () => { addLayers(); setupListeners() })

 return () => {
  map.remove()
  mapInstanceRef.current = null
  layersAddedRef.current = false
  }
 }, [])

 useMapDarkMode(
   useCallback((newStyle) => {
     const map = mapInstanceRef.current
     if (!map) return
     map.setStyle(newStyle)
   }, []),
 )

 // Update GeoJSON data when clients change
 useEffect(() => {
 const map = mapInstanceRef.current
 if (!map || !layersAddedRef.current) return

 const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
 if (source) {
 source.setData(buildGeoJSON(clients))
 }
 }, [clients])

 // Fly to focused client
 useEffect(() => {
 const map = mapInstanceRef.current
 if (!map || !focusClientId) return

 const client = clientsRef.current.find((c) => c.id === focusClientId)
 if (!client || client.lat == null || client.lng == null) return

 map.flyTo({ center: [client.lng, client.lat], zoom: 17, duration: 1000 })
 try {
 map.setFilter(HIGHLIGHT_LAYER, ['==', 'id', focusClientId])
 } catch {}
 setSelectedPin(client)
 }, [focusClientId])

 // Clear highlight when drawer closes
 useEffect(() => {
 const map = mapInstanceRef.current
 if (!map || selectedPin) return
 try {
 map.setFilter(HIGHLIGHT_LAYER, ['==', 'id', ''])
 } catch {}
 }, [selectedPin])

 const openDirection = useCallback((lat: number, lng: number) => {
 window.open(
 `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
 '_blank',
 'noopener,noreferrer',
 )
 }, [])

  return (
  <>
  <div ref={mapRef} className="w-full h-full" />

 {/* ── BOTTOM DRAWER ── */}
 {selectedPin && (
 <>
 <div className="fixed inset-0 z-30" onClick={() => setSelectedPin(null)} />
 <div className="fixed bottom-0 left-0 right-0 md:right-4 md:bottom-4 md:w-96 md:left-auto z-30 animate-slide-up md:animate-none">
 <div className="bg-[var(--card)] rounded-t-2xl md:rounded-xl shadow-2xl pb-[env(safe-area-inset-bottom,12px)] md:pb-0 overflow-hidden">
 <div className="flex justify-center pt-2 pb-1 md:hidden">
 <div className="w-9 h-1 rounded-full bg-[var(--border)] " />
 </div>
  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[var(--border)] ">
  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[var(--surface)] flex items-center justify-center">
  {selectedPin.images[0] ? (
  /* eslint-disable-next-line @next/next/no-img-element */
  <img
  src={selectedPin.images[0]}
  alt=""
  loading="lazy"
  className="w-full h-full object-cover"
  />
  ) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="text-muted-foreground/30" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg>
  )}
  </div>
 <div className="min-w-0 flex-1">
 <div className="text-[15px] font-bold text-[var(--text-primary)] truncate">
 {selectedPin.shopName || selectedPin.name}
 </div>
 {selectedPin.shopName && (
 <div className="text-[13px] text-[var(--text-secondary)] truncate">
 {selectedPin.name}
 </div>
 )}
 </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-10 h-10"
          onClick={() => {
            const map = mapInstanceRef.current
            if (map && selectedPin.lat && selectedPin.lng) {
              map.flyTo({
                center: [selectedPin.lng, selectedPin.lat],
                zoom: 17,
                duration: 800,
              })
              try {
                map.setFilter(HIGHLIGHT_LAYER, ['==', 'id', selectedPin.id])
              } catch {}
            }
          }}
        >
          <Crosshair className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-10 h-10"
          onClick={() => setSelectedPin(null)}
          aria-label="ปิดรายละเอียด"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
 </div>

 {selectedPin.address && (
 <div className="flex items-start gap-2.5 px-5 py-3 border-b border-[var(--border)] ">
 <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-muted)] " />
 <span className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
 {selectedPin.address}
 </span>
 </div>
 )}

  <div className="p-4 space-y-2 md:space-y-1.5">
    <Button
      className="w-full h-12"
      onClick={() => {
        if (selectedPin.lat && selectedPin.lng) {
          setDirectionTarget({
            id: selectedPin.id,
            name: selectedPin.shopName || selectedPin.name,
            lat: selectedPin.lat,
            lng: selectedPin.lng,
          })
        }
      }}
    >
      <NavigationArrow className="w-4 h-4" />
      เปิดแผนที่
    </Button>
    {onSelectClient && (
      <Button
        variant="secondary"
        className="w-full h-12"
        onClick={() => onSelectClient(selectedPin)}
      >
        ดูรายละเอียด
      </Button>
    )}
  </div>
 </div>
 </div>
 </>
 )}

 {/* ── DIRECTION CONFIRM ── */}
 <Dialog open={!!directionTarget} onOpenChange={(o) => !o && setDirectionTarget(null)}>
  <DialogContent showCloseButton={false} className="max-w-xs">
   <div className="w-12 h-12 mx-auto rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
    <NavigationArrow className="w-5 h-5 text-[var(--primary)]" />
   </div>
   <h3 className="text-lg font-bold text-[var(--text-primary)] text-center">
    นำทางไปยัง {directionTarget?.name}?
   </h3>
   <p className="text-sm text-[var(--text-secondary)] text-center">
    เปิด Google Maps เพื่อนำทาง
   </p>
    <div className="flex gap-2 pt-2">
      <Button
        variant="secondary"
        className="flex-1 h-12"
        onClick={() => setDirectionTarget(null)}
      >
        ยกเลิก
      </Button>
      <Button
        className="flex-1 h-12"
        onClick={() => {
          if (directionTarget) openDirection(directionTarget.lat, directionTarget.lng)
          setDirectionTarget(null)
        }}
      >
        เปิดแผนที่
      </Button>
    </div>
  </DialogContent>
 </Dialog>
 </>
 )
}
