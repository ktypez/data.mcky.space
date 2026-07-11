'use client'

import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getMapStyle } from '@/lib/map-styles'
import { useMapDarkMode } from '@/hooks/useMapDarkMode'

export interface MapPreviewProps {
  lat: number
  lng: number
}

export default function MapPreview({ lat, lng }: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const latRef = useRef(lat)
  const lngRef = useRef(lng)

  useEffect(() => { latRef.current = lat; lngRef.current = lng }, [lat, lng])
  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const el = document.createElement('div')
    el.className = 'w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-[var(--card)] shadow-sm'

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(),
      center: [lngRef.current, latRef.current],
      zoom: 15,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      interactive: false,
    })

    function addMarker(lngLat: [number, number]) {
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = new maplibregl.Marker({ element: el.cloneNode(true) as HTMLElement })
        .setLngLat(lngLat)
        .addTo(map)
    }
    addMarker([lngRef.current, latRef.current])

    map.on('style.load', () => map.resize())

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
        const c = map.getCenter()
        if (markerRef.current) markerRef.current.remove()
        const el = document.createElement('div')
        el.className = 'w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-[var(--card)] shadow-sm'
        markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map)
        map.resize()
      })
    }, []),
  )

  // Fly to + re-add marker on coord change
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 500 })
    const el = document.createElement('div')
    el.className = 'w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-[var(--card)] shadow-sm'
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapRef.current)
  }, [lat, lng])

  return (
    <div className="relative h-full w-full" style={{ minHeight: 160 }}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
