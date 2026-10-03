<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import { MapTrifold, X, MagnifyingGlass } from 'phosphor-svelte'
  import { useClientStore } from '@/stores/client-store'
  import { getTileUrl, TILE_ATTRIBUTION, TILE_MAX_ZOOM, isDarkMode, KHON_KAEN_CENTER, KHON_KAEN_BOUNDS, KHON_KAEN_MIN_ZOOM } from '@/lib/map-styles'
  import { observeMapDarkMode } from '@/lib/map-dark-mode'
  import { hasValidCoords } from '@/lib/utils'
  import { fetchClientMap } from '@/lib/storage'
  import { clientMatchesQuery } from '@/lib/clientNames'
  import { safeTooltipContent } from '@/lib/leaflet-content'
  import type { Client } from '@/types/index'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'

  type LL = typeof import('leaflet')
  async function loadLeaflet(): Promise<LL> {
    const [m] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
    return (m.default ?? m) as LL
  }
  function clusterHtml(count: number, size: number): string {
    return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:var(--primary);color:var(--primary-foreground);display:flex;align-items:center;justify-content:center;font-size:${size > 40 ? 13 : 12}px;font-weight:700;border:2px solid var(--card);box-shadow:0 2px 8px rgba(0,0,0,0.25);">${count}</div>`
  }
  function dotHtml(): string {
    return `<div style="width:12px;height:12px;border-radius:999px;background:var(--primary);border:2px solid var(--card);box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`
  }

  let storeClients = $derived($useClientStore.clients)

  let containerRef: HTMLDivElement
  let map: InstanceType<LL['Map']> | null = null
  let layer: InstanceType<LL['TileLayer']> | null = null
  let lib: LL | null = null
  let markers: InstanceType<LL['Marker']>[] = []
  let pinsRef: Client[] = []
  let dark = $state(isDarkMode())
  let darkRef = dark
  let attrOpen = $state(false)
  let failed = $state(false)
  let loading = $state(true)
  let loadError = $state<string | null>(null)
  let reloadKey = $state(0)
  let pins = $state<Client[]>([])
  let selected = $state<Client | null>(null)
  let search = $state('')
  let inputFocused = $state(false)

  let filteredForMap = $derived.by(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pins
    return pins.filter((c) => clientMatchesQuery(c, q) || c.address.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
  })
  let searchResults = $derived(filteredForMap.slice(0, 5))

  $effect(() => {
    darkRef = dark
  })
  $effect(() => {
    pinsRef = filteredForMap
  })
  $effect(() => {
    layer?.setUrl(getTileUrl(dark), true)
  })

  $effect(() => {
    const current = storeClients
    reloadKey
    let cancelled = false
    const load = async () => {
      loading = true
      loadError = null
      const withCoords = current.filter((c) => hasValidCoords(c.lat, c.lng))
      if (withCoords.length > 0 && !cancelled) {
        pins = withCoords
        loading = false
      }
      try {
        const full = await fetchClientMap()
        if (!cancelled) {
          pins = full.filter((c) => hasValidCoords(c.lat, c.lng))
          if (typeof navigator !== 'undefined' && !navigator.onLine) loadError = 'ออฟไลน์ — กำลังใช้ข้อมูลแผนที่ที่บันทึกไว้'
        }
      } catch {
        if (!cancelled) loadError = 'โหลดข้อมูลแผนที่ไม่สำเร็จ — กำลังใช้ข้อมูลที่มีอยู่'
      } finally {
        if (!cancelled) loading = false
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  })

  function updateClusters() {
    const L = lib
    const m = map
    if (!L || !m) return
    const list = pinsRef
    markers.forEach((marker) => marker.remove())
    markers = []
    if (list.length === 0) return

    const bounds = m.getBounds().pad(0.35)
    const visible = list.filter((client) => bounds.contains([client.lat as number, client.lng as number]))
    if (visible.length === 0) return
    const zoom = m.getZoom()
    const addTooltip = (marker: InstanceType<LL['Marker']>, value: string) => {
      marker.bindTooltip(safeTooltipContent(value), { direction: 'top', offset: [0, -6] })
    }

    if (zoom >= 17) {
      visible.forEach((client) => {
        const marker = L.marker([client.lat as number, client.lng as number], { icon: L.divIcon({ html: dotHtml(), className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(m)
        addTooltip(marker, client.shopName[0] || client.name[0] || client.id)
        marker.on('click', () => (selected = client))
        markers.push(marker)
      })
      return
    }

    const gridSize = zoom <= 10 ? 80 : zoom <= 12 ? 60 : 50
    const groups = new Map<string, Client[]>()
    visible.forEach((client) => {
      const point = m.latLngToContainerPoint([client.lat as number, client.lng as number])
      const key = `${Math.floor(point.x / gridSize)}_${Math.floor(point.y / gridSize)}`
      const group = groups.get(key)
      if (group) group.push(client)
      else groups.set(key, [client])
    })

    groups.forEach((group) => {
      if (group.length === 1) {
        const client = group[0]
        const marker = L.marker([client.lat as number, client.lng as number], { icon: L.divIcon({ html: dotHtml(), className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(m)
        addTooltip(marker, client.shopName[0] || client.name[0] || client.id)
        marker.on('click', () => (selected = client))
        markers.push(marker)
        return
      }
      const count = group.length
      const size = count < 10 ? 34 : count < 25 ? 40 : 48
      const avgLat = group.reduce((sum, client) => sum + (client.lat as number), 0) / group.length
      const avgLng = group.reduce((sum, client) => sum + (client.lng as number), 0) / group.length
      const marker = L.marker([avgLat, avgLng], { icon: L.divIcon({ html: clusterHtml(count, size), className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }) }).addTo(m)
      marker.on('click', () => {
        const clusterBounds = L.latLngBounds(group.map((client) => [client.lat as number, client.lng as number] as [number, number]))
        m.fitBounds(clusterBounds, { padding: [48, 48], maxZoom: 16 })
      })
      addTooltip(marker, `${count} รายการ`)
      markers.push(marker)
    })
  }

  onMount(() => {
    let cancelled = false
    let raf = 0
    let initTimer: ReturnType<typeof setTimeout> | undefined
    let resizeObserver: ResizeObserver | undefined
    const unsubDark = observeMapDarkMode((d) => (dark = d))

    const init = async () => {
      if (cancelled) return
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
          zoomControl: true,
          minZoom: KHON_KAEN_MIN_ZOOM,
          maxBounds: [
            [KHON_KAEN_BOUNDS[0][1], KHON_KAEN_BOUNDS[0][0]],
            [KHON_KAEN_BOUNDS[1][1], KHON_KAEN_BOUNDS[1][0]],
          ],
          maxBoundsViscosity: 1,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        }).setView([KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], 11)
        layer = L.tileLayer(getTileUrl(darkRef), { maxZoom: TILE_MAX_ZOOM, detectRetina: true, attribution: TILE_ATTRIBUTION }).addTo(m)
        map = m
        const onMove = () => {
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(() => updateClusters())
        }
        m.on('moveend zoomend', onMove)
        m.on('click', () => (selected = null))
        m.on('tileerror', () => {
          if (!cancelled) loadError = 'โหลดผืนแผนที่บางส่วนไม่สำเร็จ'
        })
        resizeObserver = new ResizeObserver(() => {
          if (cancelled) return
          m.invalidateSize({ pan: false })
          updateClusters()
        })
        resizeObserver.observe(containerRef)
        initTimer = setTimeout(() => {
          if (!cancelled) {
            m.invalidateSize()
            updateClusters()
          }
        }, 100)
      } catch {
        if (!cancelled) failed = true
      }
    }
    void init()

    return () => {
      cancelled = true
      unsubDark()
      if (initTimer) clearTimeout(initTimer)
      resizeObserver?.disconnect()
      cancelAnimationFrame(raf)
      try {
        map?.remove()
      } catch {}
      map = null
      lib = null
      layer = null
      markers = []
    }
  })

  $effect(() => {
    filteredForMap
    if (map && lib) updateClusters()
  })

  $effect(() => {
    if (!map || pins.length === 0) return
    const m = map
    const center = m.getCenter()
    const distance = Math.abs(center.lat - KHON_KAEN_CENTER[1]) + Math.abs(center.lng - KHON_KAEN_CENTER[0])
    if (distance >= 0.01 || m.getZoom() !== 11) return
    if (pins.length === 1) {
      m.setView([pins[0].lat as number, pins[0].lng as number], 14)
    } else {
      const L = lib
      if (!L) return
      const bounds = L.latLngBounds(pins.map((pin) => [pin.lat as number, pin.lng as number] as [number, number]))
      try {
        m.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
      } catch {}
    }
  })
</script>

{#if failed}
  <section class="mx-auto flex h-full max-w-xl items-center justify-center px-5 pb-4 pt-6 sm:px-6">
    <p class="text-sm text-muted-foreground">ไม่สามารถโหลดแผนที่ได้</p>
  </section>
{:else}
  <section class="mx-auto flex h-full max-w-xl flex-col overflow-hidden px-5 pb-4 pt-6 sm:px-6">
    <h1 class="sr-only">แผนที่รายการลูกค้า</h1>
    {#if loadError}
      <div class="mb-4 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm" role="status">
        <span>{loadError}</span>
        <button type="button" onclick={() => reloadKey++} class="min-h-11 shrink-0 rounded-full border border-border px-3 text-xs hover:bg-muted">ลองใหม่</button>
      </div>
    {/if}

    <div class="relative mb-4 shrink-0">
      <MagnifyingGlass class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" aria-hidden />
      <input
        value={search}
        oninput={(e) => (search = e.currentTarget.value)}
        onfocus={() => (inputFocused = true)}
        onblur={() => (inputFocused = false)}
        placeholder="ค้นหาในแผนที่ — ชื่อ ร้าน ที่อยู่…"
        aria-label="ค้นหาในแผนที่"
        class="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm shadow-sm outline-none focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5"
        autocomplete="off"
        spellcheck="false"
      />
      {#if search}
        <button type="button" onclick={() => (search = '')} class="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground" aria-label="ล้างการค้นหา">
          <X class="h-3.5 w-3.5" weight="bold" aria-hidden />
        </button>
      {/if}
      {#if inputFocused && search.trim()}
        <div class="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {#if searchResults.length > 0}
            {#each searchResults as client}
              <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => { inputFocused = false; selected = client; map?.setView([client.lat as number, client.lng as number], 15) }} class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted">
                {#if client.images[0] || client.thumb}
                  <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover border border-border" />
                {:else}
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-xs">{(client.shopName[0] || client.name[0] || '·').trim().charAt(0).toUpperCase()}</div>
                {/if}
                <span class="min-w-0 flex-1"><ClientNames client={client} variant="list" titleClassName="text-sm leading-tight truncate" subClassName="text-xs truncate opacity-60" /></span>
              </button>
            {/each}
          {:else}
            <div class="px-4 py-6 text-center text-sm text-muted-foreground">ไม่พบ “{search}”</div>
          {/if}
          {#if filteredForMap.length > 5}
            <div class="px-4 py-2 text-center font-mono text-[10px] text-muted-foreground">+ {filteredForMap.length - 5} รายการที่ซ่อน — พิมพ์ให้เจาะจงขึ้น</div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border">
      <div bind:this={containerRef} class="h-full w-full z-0"></div>
      <div class="absolute bottom-1 right-1 z-[400] flex items-center gap-1">
        {#if attrOpen}
          <span class="rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] leading-none text-white backdrop-blur">{TILE_ATTRIBUTION}</span>
        {/if}
        <button type="button" onclick={(e) => { e.stopPropagation(); attrOpen = !attrOpen }} aria-label={attrOpen ? 'ซ่อนเครดิต' : 'แสดงเครดิต'} class="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur hover:bg-black/70">©</button>
      </div>
      {#if loading}
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"><span class="rounded-full bg-card px-4 py-2 text-xs shadow" role="status">กำลังโหลดแผนที่…</span></div>
      {/if}
      {#if !loading && pins.length === 0 && !loadError}
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/80 p-6 text-center">
          <MapTrifold size={28} class="opacity-30" aria-hidden />
          <p class="text-sm font-medium">ยังไม่มีหมุด</p>
          <p class="text-xs text-muted-foreground">เพิ่มพิกัดในหน้ารายการ แล้วจะแสดงที่นี่</p>
          <button type="button" onclick={() => push('/')} class="mt-2 min-h-11 rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">ไปหน้าหลัก</button>
        </div>
      {/if}
      {#if selected}
        <div class="absolute bottom-3 left-3 right-3 z-20">
          <div class="rounded-2xl border border-border bg-card p-3 shadow-xl">
            <div class="flex gap-3">
              {#if selected.images[0] || selected.thumb}
                <AppImage src={selected.thumb ?? selected.images[0]} fallbackSrc={selected.images[0]} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl object-cover border border-border" />
              {:else}
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground font-mono text-xs">{(selected.shopName[0] || selected.name[0] || '·').trim().charAt(0).toUpperCase()}</div>
              {/if}
              <div class="min-w-0 flex-1">
                <ClientNames client={selected} variant="list" titleClassName="text-sm font-medium leading-tight truncate" subClassName="text-xs truncate opacity-60" />
                {#if selected.address}
                  <p class="mt-0.5 truncate text-xs text-muted-foreground">{selected.address}</p>
                {/if}
                <p class="font-mono text-[10px] text-muted-foreground/60">{selected.lat?.toFixed(4)}, {selected.lng?.toFixed(4)}</p>
              </div>
              <button type="button" onclick={() => (selected = null)} aria-label="ปิดรายละเอียดบนแผนที่" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"><X size={14} weight="bold" aria-hidden /></button>
            </div>
            <div class="mt-3 flex gap-2">
              <button type="button" onclick={() => push(`/c/${encodeURIComponent(selected!.id)}`)} class="min-h-11 flex-1 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground hover:opacity-90">ดูรายละเอียด →</button>
              <a href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" onclick={(e) => e.stopPropagation()} class="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 py-2.5 text-xs hover:bg-muted">Google Maps</a>
            </div>
          </div>
        </div>
      {/if}
    </div>
    {#if !loading && pins.length > 0}
      <div class="mt-3 flex shrink-0 items-center gap-2 overflow-auto">
        <button type="button" onclick={() => map?.setView([KHON_KAEN_CENTER[1], KHON_KAEN_CENTER[0]], 11)} class="min-h-11 shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">ทั้งจังหวัด</button>
        <span class="font-mono text-[10px] text-muted-foreground">· ขอนแก่น · ไทยล้วน · รวมกลุ่มอัตโนมัติ</span>
      </div>
    {/if}
  </section>
{/if}
