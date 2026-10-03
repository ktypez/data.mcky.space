<script lang="ts">
  import { onMount } from 'svelte'
  import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_BOUNDS, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
  import { observeMapDarkMode } from '@/lib/map-dark-mode'

  let { lat, lng }: { lat: number; lng: number } = $props()

  type LL = typeof import('leaflet')
  async function loadLeaflet(): Promise<LL> {
    const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
    return (mod.default ?? mod) as LL
  }

  let containerRef = $state<HTMLDivElement>()
  let map: InstanceType<LL['Map']> | null = null
  let layer: InstanceType<LL['TileLayer']> | null = null
  let lib: LL | null = null
  let marker: InstanceType<LL['Marker']> | null = null
  let failed = $state(false)
  let dark = $state(isDarkMode())
  let attrOpen = $state(false)

  $effect(() => {
    layer?.setUrl(getTileUrl(dark), true)
  })

  onMount(() => {
    let cancelled = false
    const unsubDark = observeMapDarkMode((d) => (dark = d))
    ;(async () => {
      let L: LL
      try {
        L = await loadLeaflet()
      } catch {
        if (!cancelled) failed = true
        return
      }
      if (cancelled || !L?.map || !containerRef) return
      lib = L
      try {
        const m = L.map(containerRef, {
          attributionControl: false,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
          minZoom: KHON_KAEN_MIN_ZOOM,
          maxBounds: [[KHON_KAEN_BOUNDS[0][1], KHON_KAEN_BOUNDS[0][0]], [KHON_KAEN_BOUNDS[1][1], KHON_KAEN_BOUNDS[1][0]]],
          maxBoundsViscosity: 1.0,
        }).setView([lat, lng], 15)
        layer = L.tileLayer(getTileUrl(dark), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(m)
        const dot = document.createElement('div')
        dot.className = 'w-3 h-3 rounded-full bg-primary border-2 border-card shadow-sm'
        marker = L.marker([lat, lng], { icon: L.divIcon({ html: dot, className: '', iconSize: [12, 12], iconAnchor: [6, 6] }), interactive: false }).addTo(m)
        map = m
      } catch {
        if (!cancelled) failed = true
      }
    })()
    return () => {
      cancelled = true
      unsubDark()
      try {
        map?.remove()
      } catch {}
      map = null
      marker = null
      lib = null
      layer = null
    }
  })

  $effect(() => {
    if (!map || !lib) return
    map.flyTo([lat, lng], 15, { duration: 0.5 })
    marker?.remove()
    const dot = document.createElement('div')
    dot.className = 'w-3 h-3 rounded-full bg-primary border-2 border-card shadow-sm'
    marker = lib.marker([lat, lng], { icon: lib.divIcon({ html: dot, className: '', iconSize: [12, 12], iconAnchor: [6, 6] }), interactive: false }).addTo(map)
  })
</script>

{#if failed}
  <div class="relative flex h-full w-full items-center justify-center bg-muted font-mono text-xs text-muted-foreground" style="min-height: 160px">{lat.toFixed(6)}, {lng.toFixed(6)}</div>
{:else}
  <div class="relative h-full w-full">
    <div bind:this={containerRef} class="h-full w-full z-0" style="min-height: 160px"></div>
    <div class="absolute bottom-1 right-1 z-10 flex items-center gap-1">
      <span class="rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-none text-white backdrop-blur {attrOpen ? '' : 'hidden'}">{TILE_ATTRIBUTION}</span>
      <button type="button" onclick={(e) => { e.stopPropagation(); attrOpen = !attrOpen }} aria-label={attrOpen ? 'ซ่อนเครดิต' : 'แสดงเครดิต'} class="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur hover:bg-black/70">©</button>
    </div>
  </div>
{/if}
