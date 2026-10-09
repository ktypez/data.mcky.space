<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { OpenLocationCode } from 'open-location-code'
  import { pinHtml } from '@/lib/pin'
  import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_CENTER, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
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
  // MUST stay $state: Leaflet loads asynchronously, so the coords effect below
  // has to re-run once the map instance finally exists. As a plain `let` the
  // effect runs once at mount (map still null), never again, and the pin never
  // appears. Guarded by scripts/map-e2e.mjs.
  let map = $state<InstanceType<LL['Map']> | null>(null)
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
        const hasPos = lat != null && lng != null
        const m = L.map(containerRef, {
          attributionControl: false,
          minZoom: KHON_KAEN_MIN_ZOOM,
          // No maxBounds: a hard clamp refuses to pan to any fix outside the
          // province, so the readout updates while the pin stays off-screen.
        }).setView(hasPos ? [lat, lng] : [KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], hasPos ? PIN_ZOOM : PROVINCE_ZOOM)
        layer = L.tileLayer(getTileUrl(dark), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(m)
        m.on('click', (e) => {
          const { lat: mlat, lng: mlng } = e.latlng
          onChangeCb(mlat, mlng)
          m.flyTo([mlat, mlng], Math.max(m.getZoom(), PIN_ZOOM), { duration: 0.6 })
          placeMarker(mlat, mlng)
        })
        // Assigning the reactive `map` re-triggers the coords effect below,
        // which owns marker placement and view movement.
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

  // Runs whenever `map` finishes initializing or the coords change.
  $effect(() => {
    const m = map
    if (!m || lat == null || lng == null) return
    if (marker) marker.setLatLng([lat, lng])
    else placeMarker(lat, lng)
    const isFirst = !initialized
    initialized = true
    if (isFirst) {
      // Skip the pan on first placement: setView above already centred the map.
      if (lat !== KHON_KAEN_CENTER[1] || lng !== KHON_KAEN_CENTER[0]) m.flyTo([lat, lng], PIN_ZOOM, { duration: 0.6 })
      return
    }
    m.setView([lat, lng], Math.max(m.getZoom(), PIN_ZOOM), { animate: true, duration: 0.6 })
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
