import { useEffect, useRef, useState, useCallback } from 'react'
import type { Client } from '@/types'
import 'maplibre-gl/dist/maplibre-gl.css'
import { X } from '@phosphor-icons/react'
import { getMapStyle } from '@/lib/map-styles'
import { cssVarToHex, hasValidCoords, DEFAULT_MAP_CENTER } from '@/lib/utils'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'
import ClientNames from '@/components/ClientNames'

// maplibre-gl is loaded globally by a CDN <script> in index.html. Read it
// dynamically (not a module-scope const) because the lazy-loaded chunk can
// execute before the CDN resolves on slow networks, and there is a jsDelivr
// fallback loader below that populates window.maplibregl a moment later.
// Freezing `const GL = window.maplibregl` at module scope would capture
// undefined permanently and the map could never initialize.
function loadGL(): any {
  return (window as any).maplibregl
}

// Log for diagnosis — visible in any remote-log capture.
if (typeof console !== 'undefined') {
  console.log('[InlineMap] window.maplibregl:', loadGL() ? 'present' : 'absent')
}

// Fallback loader: if the CDN script in index.html hasn't loaded within
// 1200 ms, try jsDelivr as backup. Avoids map staying blank when one CDN
// is unreachable (some ISPs/regions block unpkg).
if (!loadGL() && typeof document !== 'undefined') {
  setTimeout(() => {
    if (loadGL()) return // loaded in the meantime
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js'
    s.onload = () => console.log('[InlineMap] maplibre-gl loaded via jsDelivr fallback')
    s.onerror = () => console.error('[InlineMap] CDN fallback (jsDelivr) also failed')
    document.head.appendChild(s)
  }, 1200)
}

const SOURCE_ID = 'clients'
const CLUSTER_LAYER = 'clusters'
const CLUSTER_COUNT_LAYER = 'cluster-count'
const POINT_LAYER = 'points'
const HIGHLIGHT_LAYER = 'point-highlight'

interface Props {
  clients: Client[]
  focusClientId?: string | null
  onSelectClient?: (client: Client) => void
}

function getPinColor(): string {
  return cssVarToHex('--pin-color', '#2e2e2e')
}

function getStrokeColor(): string {
  return cssVarToHex('--card', '#ffffff')
}

function buildGeoJSON(clients: Client[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: clients
      .filter((c) => hasValidCoords(c.lat, c.lng))
      .map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng!, c.lat!] },
        properties: { id: c.id },
      })),
  }
}

export default function InlineMap({
  clients,
  focusClientId,
  onSelectClient,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const clientsRef = useRef(clients)
  const [selectedPin, setSelectedPin] = useState<Client | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const layersAddedRef = useRef(false)

  useEffect(() => {
    clientsRef.current = clients
  }, [clients])

  // Init map — entire body wrapped so no uncaught crash can blank the page.
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const container = mapRef.current
    let cancelled = false
    let retries = 0
    const MAX_WAIT_MS = 10000

    // The CDN loader (index.html) and the jsDelivr fallback above populate
    // window.maplibregl asynchronously. Poll for it instead of bailing on the
    // first frame, so a slow CDN doesn't leave the map permanently blank.
    function tryInit() {
      if (cancelled) return
      const GL = loadGL()
      if (!GL || !GL.Map) {
        retries += 1
        if (retries * 200 >= MAX_WAIT_MS) {
          console.error('[InlineMap] maplibre-gl never became available on window')
          setMapError('ไม่พบไลบรารีแผนที่ — กรุณารีเฟรชหน้า')
          return
        }
        setTimeout(tryInit, 200)
        return
      }

      try {
        const map = new GL.Map({
          container,
          style: getMapStyle(),
          center: DEFAULT_MAP_CENTER,
          zoom: 6,
          attributionControl: false,
        })

        map.addControl(new GL.NavigationControl(), 'bottom-right')
        // Assign ref BEFORE registering listeners so cleanup can always .remove().
        mapInstanceRef.current = map

        let listenersAdded = false
        let initialFitDone = false

        // --- layers ---
        function addLayers() {
          for (const id of [
            HIGHLIGHT_LAYER,
            POINT_LAYER,
            CLUSTER_COUNT_LAYER,
            CLUSTER_LAYER,
          ]) {
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

          if (!initialFitDone) {
            initialFitDone = true
            const data = buildGeoJSON(clientsRef.current)
            if (data.features.length > 0) {
              const bounds = new GL.LngLatBounds()
              data.features.forEach((f) => {
                const coords = (f.geometry as GeoJSON.Point).coordinates
                bounds.extend(coords as [number, number])
              })
              map.fitBounds(bounds, { padding: 50, maxZoom: 15 })
            }
          }
        }

        // --- listeners ---
        function setupListeners() {
          if (listenersAdded) return
        listenersAdded = true

        map.on('click', CLUSTER_LAYER, (e) => {
          const feature = e.features?.[0]
          if (!feature) return
          const coords = (feature.geometry as GeoJSON.Point).coordinates
          const zoom = map.getZoom() + 2
          map.flyTo({ center: coords as [number, number], zoom, duration: 600 })
        })

        function onPointClick(
          e: GL.MapMouseEvent & {
            features?: GL.MapGeoJSONFeature[]
          },
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

        map.on('mouseenter', CLUSTER_LAYER, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', CLUSTER_LAYER, () => (map.getCanvas().style.cursor = ''))
        map.on('mouseenter', POINT_LAYER, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', POINT_LAYER, () => (map.getCanvas().style.cursor = ''))
        map.on('mouseenter', HIGHLIGHT_LAYER, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', HIGHLIGHT_LAYER, () => (map.getCanvas().style.cursor = ''))
      }

      // Wait for style to load before adding layers.
      map.on('error', (e) => {
        const err = (e as any).error || e
        const httpStatus = err?.status as number | undefined
        const msg = httpStatus
          ? `ไม่สามารถโหลด tile (HTTP ${httpStatus})`
          : err?.message || 'เกิดข้อผิดพลาดในการโหลดแผนที่'
        console.error('[InlineMap error]', err)
        setMapError(msg)
      })
      map.on('style.load', () => {
        setMapError(null) // clear any tile error once style is ready
        addLayers()
        setupListeners()
      })
    } catch (err) {
      console.error('[InlineMap] init failed:', err)
      setMapError(String(err instanceof Error ? err.message : err))
    }
      }

    // Kick off the (re)trying init.
    tryInit()

    return () => {
      cancelled = true
      try { mapInstanceRef.current?.remove() } catch {}
      mapInstanceRef.current = null
      layersAddedRef.current = false
    }
  }, [])

  // React to theme changes → swap base style
  useMapDarkMode(
    useCallback((newStyle) => {
      const map = mapInstanceRef.current
      if (!map) return
      try { map.setStyle(newStyle) } catch {}
    }, []),
  )

  // Update GeoJSON when clients change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !layersAddedRef.current) return
    const source = map.getSource(SOURCE_ID) as GL.GeoJSONSource
    if (source) source.setData(buildGeoJSON(clients))
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

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm text-destructive text-sm p-8 z-20">
          <div className="text-center">
            <p className="font-medium">แผนที่โหลดไม่สำเร็จ</p>
            <p className="text-xs text-muted-foreground mt-1">{mapError}</p>
          </div>
        </div>
      )}

      {!mapError && selectedPin && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setSelectedPin(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 md:right-4 md:bottom-4 md:w-96 md:left-auto z-30 animate-slide-up md:animate-none">
            <div className="bg-card rounded-t-2xl md:rounded-xl shadow-2xl pb-[env(safe-area-inset-bottom,12px)] md:pb-0 overflow-hidden">
              <div className="flex justify-center pt-2 pb-1 md:hidden">
                <div className="w-9 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-card flex items-center justify-center">
                  {selectedPin.images[0] ? (
                    <img
                      src={selectedPin.images[0]}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground/30 text-lg">📍</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <ClientNames
                    client={selectedPin}
                    titleClassName="text-[17px] font-bold text-foreground truncate"
                    subClassName="text-[15px] text-muted-foreground truncate"
                  />
                </div>
                <button
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
                  onClick={() => setSelectedPin(null)}
                  aria-label="ปิดรายละเอียด"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedPin.address && (
                <div className="flex items-start gap-2.5 px-5 py-3 border-b border-border">
                  <span className="text-[15px] text-muted-foreground leading-relaxed">
                    {selectedPin.address}
                  </span>
                </div>
              )}

              <div className="p-4">
                <button
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium"
                  onClick={() => {
                    if (onSelectClient) onSelectClient(selectedPin)
                    else setSelectedPin(null)
                  }}
                >
                  ดูรายละเอียด
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
