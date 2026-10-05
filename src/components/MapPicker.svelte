<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { OpenLocationCode } from 'open-location-code'
  import { pinHtml } from '@/lib/pin'
  import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_CENTER, KHON_KAEN_BOUNDS, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
  import { cssVarToHex } from '@/lib/utils'
  import { applyTileDarkMode, observeMapDarkMode } from '@/lib/map-dark-mode'

  let { lat, lng, onChange }: { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void } = $props()

  type LL = typeof import('leaflet')
  async function loadLeaflet(): Promise<LL> {
    const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
    return (mod.default ?? mod) as LL
  }
  let olcInstance: OpenLocationCode | null = null
  function getOlc() {
    if (!olcInstance) olcInstance = new OpenLocationCode()
    return olcInstance
  }
  const getPinColor = () => cssVarToHex('--pin-color', '#2563eb')
  const PIN_ZOOM = 16
  const PROVINCE_ZOOM = 11

  let containerRef = $state<HTMLDivElement>()
  let map: InstanceType<LL['Map']> | null = null
  let layer: InstanceType<LL['TileLayer']> | null = null
  let marker: InstanceType<LL['Marker']> | null = null
  let lib: LL | null = null
  let mapFailed = $state(false)
  let dark = $state(isDarkMode())
  let attrOpen = $state(false)
  let initialized = false
  let onChangeCb = untrack(() => onChange)
  $effect(() => {
    onChangeCb = onChange
  })
  let latRef = untrack(() => lat)
  let lngRef = untrack(() => lng)
  $effect(() => {
    latRef = lat
    lngRef = lng
  })

  function placeMarker(mlat: number, mlng: number) {
    if (!lib || !map) return
    marker?.remove()
    const el = document.createElement('div')
    el.innerHTML = pinHtml(28, true, getPinColor())
    marker = lib.marker([mlat, mlng], { icon: lib.divIcon({ html: el, className: '', iconSize: [28, 28], iconAnchor: [14, 25] }) }).addTo(map)
  }

  $effect(() => {
    layer?.setUrl(getTileUrl(dark), true)
    applyTileDarkMode(map, dark)
  })

  onMount(() => {
    let cancelled = false
    const unsubDark = observeMapDarkMode((d) => (dark = d))
    ;(async () => {
      let L: LL
      try {
        L = await loadLeaflet()
      } catch {
        if (!cancelled) mapFailed = true
        return
      }
      if (cancelled || !L?.map || !containerRef) return
      lib = L
      try {
        const hasPos = lngRef != null && latRef != null
        const m = L.map(containerRef, {
          attributionControl: false,
          minZoom: KHON_KAEN_MIN_ZOOM,
          maxBounds: [[KHON_KAEN_BOUNDS[0][1], KHON_KAEN_BOUNDS[0][0]], [KHON_KAEN_BOUNDS[1][1], KHON_KAEN_BOUNDS[1][0]]],
          maxBoundsViscosity: 1.0,
        }).setView(hasPos ? [latRef as number, lngRef as number] : [KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], hasPos ? PIN_ZOOM : PROVINCE_ZOOM)
        layer = L.tileLayer(getTileUrl(dark), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(m)
        m.on('click', (e) => {
          const { lat: mlat, lng: mlng } = e.latlng
          onChangeCb(mlat, mlng)
          m.flyTo([mlat, mlng], Math.max(m.getZoom(), PIN_ZOOM), { duration: 0.6 })
          placeMarker(mlat, mlng)
        })
        if (latRef != null && lngRef != null) {
          initialized = true
          placeMarker(latRef, lngRef)
        }
        map = m
        applyTileDarkMode(m, dark)
        setTimeout(() => {
          if (!cancelled) m.invalidateSize()
        }, 100)
      } catch {
        if (!cancelled) mapFailed = true
      }
    })()
    return () => {
      cancelled = true
      unsubDark()
      try {
        map?.remove()
      } catch {}
      map = null
      lib = null
      layer = null
      marker = null
    }
  })

  $effect(() => {
    const m = map
    if (!m || lat == null || lng == null) return
    if (!initialized) {
      initialized = true
      // Always place marker when coords are provided
      placeMarker(lat, lng)
      if (lat !== KHON_KAEN_CENTER[1] || lng !== KHON_KAEN_CENTER[0]) m.flyTo([lat, lng], PIN_ZOOM, { duration: 0.6 })
      return
    }
    if (marker) marker.setLatLng([lat, lng])
    else placeMarker(lat, lng)
    m.flyTo([lat, lng], Math.max(m.getZoom(), PIN_ZOOM), { duration: 0.6 })
  })
</script>

{#if mapFailed}
  <div class="w-full h-48 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center text-muted-foreground text-xs">ไม่สามารถโหลดแผนที่ได้</div>
{:else}
  <div class="w-full h-48 rounded-xl overflow-hidden border border-border relative">
    <div bind:this={containerRef} class="w-full h-full z-0"></div>
    {#if lat != null && lng != null}
      <div class="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[13px] font-mono text-foreground whitespace-nowrap pointer-events-none flex items-center gap-1.5">
        <span class="text-foreground/90">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
        <span class="text-foreground/30">|</span>
        <span class="text-success font-bold tracking-wider">{getOlc().encode(lat, lng, 10)}</span>
      </div>
    {/if}
    <div class="absolute bottom-1 right-1 z-10 flex items-center gap-1">
      <span class="rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-none text-white backdrop-blur {attrOpen ? '' : 'hidden'}">{TILE_ATTRIBUTION}</span>
      <button type="button" onclick={(e) => { e.stopPropagation(); attrOpen = !attrOpen }} aria-label={attrOpen ? 'ซ่อนเครดิต' : 'แสดงเครดิต'} class="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur hover:bg-black/70">©</button>
    </div>
  </div>
{/if}
