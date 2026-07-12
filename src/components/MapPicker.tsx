'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { OpenLocationCode } from 'open-location-code'
import { pinHtml } from '@/lib/pin'
import { getMapStyle } from '@/lib/map-styles'
import { cssVarToHex } from '@/lib/utils'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'

let olcInstance: OpenLocationCode | null = null
function getOlc(): OpenLocationCode {
  if (!olcInstance) olcInstance = new OpenLocationCode()
  return olcInstance
}

const DEFAULT_CENTER: [number, number] = [102.8236, 16.4322]

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
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const initializedRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const latRef = useRef(lat)
  const lngRef = useRef(lng)

  useEffect(() => { onChangeRef.current = onChange })
  useEffect(() => { latRef.current = lat; lngRef.current = lng }, [lat, lng])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: getMapStyle(),
        center: lngRef.current != null && latRef.current != null ? [lngRef.current, latRef.current] : DEFAULT_CENTER,
        zoom: latRef.current != null ? PIN_ZOOM : DEFAULT_ZOOM,
        attributionControl: false,
      })
    } catch (err) {
      console.error('MapPicker init failed', err)
      setMapFailed(true)
      return
    }

    map.on('click', (e) => {
      const { lng: mlng, lat: mlat } = e.lngLat
      onChangeRef.current(mlat, mlng)
      map.flyTo({ center: [mlng, mlat], zoom: Math.max(map.getZoom(), PIN_ZOOM), duration: 600 })

      if (markerRef.current) markerRef.current.remove()
      const el = document.createElement('div')
      el.innerHTML = pinHtml(28, true, getPinColor())
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([mlng, mlat]).addTo(map)
    })

    // Add initial marker if position provided
    if (latRef.current != null && lngRef.current != null) {
      initializedRef.current = true
      const el = document.createElement('div')
      el.innerHTML = pinHtml(28, true, getPinColor())
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lngRef.current, latRef.current]).addTo(map)
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useMapDarkMode(
    useCallback((newStyle) => {
      const map = mapRef.current
      if (!map) return
      map.setStyle(newStyle)
      map.once('style.load', () => {
        if (markerRef.current) {
          const pos = markerRef.current.getLngLat()
          markerRef.current.remove()
          const el = document.createElement('div')
          el.innerHTML = pinHtml(28, true, getPinColor())
          markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(pos).addTo(map)
        }
      })
    }, []),
  )

  // Update marker and fly when lat/lng change externally
  useEffect(() => {
    const map = mapRef.current
    if (!map || lat == null || lng == null) return

    if (!initializedRef.current) {
      initializedRef.current = true
      if (lat !== DEFAULT_CENTER[1] || lng !== DEFAULT_CENTER[0]) {
        map.flyTo({ center: [lng, lat], zoom: PIN_ZOOM, duration: 600 })
      }
      if (!markerRef.current) {
        const el = document.createElement('div')
        el.innerHTML = pinHtml(28, true, getPinColor())
        markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
      }
      return
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.innerHTML = pinHtml(28, true, getPinColor())
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
    }

    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), PIN_ZOOM), duration: 600 })
  }, [lat, lng])

  if (mapFailed) {
    return (
      <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-[var(--surface)] flex items-center justify-center text-[var(--text-muted)] text-xs">
        ไม่สามารถโหลดแผนที่ได้
      </div>
    )
  }

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-border relative">
      <div ref={containerRef} className="w-full h-full" />
      {lat != null && lng != null && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[11px] font-mono text-foreground whitespace-nowrap pointer-events-none flex items-center gap-1.5">
          <span className="text-foreground/90">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
          <span className="text-foreground/30">|</span>
          <span className="text-[var(--success)] font-bold tracking-wider">
            {getOlc().encode(lat, lng, 10)}
          </span>
        </div>
      )}
    </div>
  )
}
