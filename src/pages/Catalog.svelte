<script lang="ts">
  import { Funnel, MagnifyingGlass, X } from 'phosphor-svelte'
  import { push } from 'svelte-spa-router'
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  import { useClientStore } from '@/stores/client-store'
  import { useFilterStore } from '@/stores/filter-store'
  import { FilterKey } from '@/types/index'
  import { applyCounts, applyFilter, sortByCreatedDesc } from '@/lib/filter'
  import { get } from 'svelte/store'
  import { onMount } from 'svelte'
  import AppDialog from '@/components/AppDialog.svelte'
  import CatalogRow from '@/components/CatalogRow.svelte'

  let clients = $derived($useClientStore.clients)
  let loading = $derived($useClientStore.loading)
  let error = $derived($useClientStore.error)
  let offline = $derived($useClientStore.offline)
  let refresh = $derived($useClientStore.refresh)
  let search = $derived($useFilterStore.search)
  let setSearch = $derived($useFilterStore.setSearch)
  let filter = $derived($useFilterStore.filter)
  let setFilter = $derived($useFilterStore.setFilter)
  let recentCutoff = $derived($useFilterStore.recentCutoff)

  let query = $derived(search.trim().toLowerCase())
  let counts = $derived(applyCounts(clients, recentCutoff))
  let filtered = $derived.by(() => {
    const result = applyFilter(clients, query, filter, recentCutoff)
    return sortByCreatedDesc(result)
  })

  let focused = $state(0)
  let filterOpen = $state(false)
  let searchInput: HTMLInputElement | undefined = $state()

  onMount(() => {
    // Mobile browsers restore form fields on their own when a page comes back —
    // session restore after the app was killed, PWA resume, or the back/forward
    // cache. That happens without an input event, so the box ends up showing
    // one term while the list is still filtered by another, and the catalog
    // looks like it lost data. Re-assert the store's value on the way back.
    const syncFromStore = () => {
      if (searchInput && searchInput.value !== search) searchInput.value = search
    }
    window.addEventListener('pageshow', syncFromStore)
    document.addEventListener('visibilitychange', syncFromStore)
    return () => {
      window.removeEventListener('pageshow', syncFromStore)
      document.removeEventListener('visibilitychange', syncFromStore)
    }
  })

  $effect(() => {
    filtered.length // re-clamp when the list changes
    focused = Math.min(focused, Math.max(filtered.length - 1, 0))
  })

  const FILTER_LABELS: Record<FilterKey, string> = {
    [FilterKey.All]: 'ทั้งหมด',
    [FilterKey.WithImages]: 'มีรูป',
    [FilterKey.NoImages]: 'ไม่มีรูป',
    [FilterKey.Notes]: 'มีโน้ต',
    [FilterKey.Recent]: 'ล่าสุด',
    [FilterKey.Penpay]: 'จ่ายในวัน',
    [FilterKey.Credit]: 'บัตรเครดิต',
  }

  // The pills became one button on the right of the search field, so the
  // choices move into a sheet and carry their own counts.
  const FILTER_CHOICES = [
    { key: FilterKey.All, count: () => counts.total },
    { key: FilterKey.WithImages, count: () => counts.withImages },
    { key: FilterKey.NoImages, count: () => counts.noImages },
    { key: FilterKey.Notes, count: () => counts.notes },
    { key: FilterKey.Recent, count: () => counts.recent },
    { key: FilterKey.Penpay, count: () => counts.penpay },
    { key: FilterKey.Credit, count: () => counts.credit },
  ]

  let parentRef: HTMLDivElement | undefined = $state()
  let vstore: ReturnType<typeof createVirtualizer<HTMLDivElement, HTMLDivElement>> | undefined = $state()

  $effect(() => {
    if (!parentRef || vstore) return
    vstore = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: filtered.length,
      getScrollElement: () => parentRef!,
      estimateSize: () => 64,
      overscan: 10,
    })
  })

  $effect(() => {
    const count = filtered.length
    if (vstore) get(vstore).setOptions({ count })
  })

  $effect(() => {
    if (filtered.length === 0 || !vstore) return
    try {
      get(vstore).scrollToIndex(focused, { align: 'auto' })
    } catch {
      /* index can lag a filtered list */
    }
  })

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && filtered.length > 0) {
      e.preventDefault()
      focused = Math.min(focused + 1, filtered.length - 1)
    }
    if (e.key === 'ArrowUp' && filtered.length > 0) {
      e.preventDefault()
      focused = Math.max(focused - 1, 0)
    }
    if (e.key === 'Enter' && filtered[focused]) push(`/c/${encodeURIComponent(filtered[focused].id)}`)
  }

  const retry = () => {
    void refresh().catch(() => undefined)
  }
</script>

<div class="mx-auto flex h-full max-w-xl flex-col overflow-hidden px-3 pt-5 sm:px-4">
  <h1 class="sr-only">รายการลูกค้า</h1>
  <div class="flex shrink-0 gap-2">
    <div class="relative min-w-0 flex-1">
      <MagnifyingGlass class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" aria-hidden />
      <input
        bind:this={searchInput}
        value={search}
        oninput={(e) => {
          setSearch(e.currentTarget.value)
          focused = 0
        }}
        onkeydown={onKeyDown}
        placeholder="ค้นหาชื่อ ร้าน หรือ ID…"
        aria-label="ค้นหาชื่อ ร้าน หรือ ID"
        name="q"
        autocomplete="off"
        spellcheck="false"
        class="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm shadow-sm outline-none placeholder:text-muted-foreground/70 focus:border-foreground/20 focus:ring-4 focus:ring-foreground/5"
      />
      {#if search}
        <button
          type="button"
          onclick={() => {
            setSearch('')
            focused = 0
          }}
          class="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label="ล้างการค้นหา"
        >
          <X class="h-3.5 w-3.5" weight="bold" aria-hidden />
        </button>
      {:else}
        <span class="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] text-primary-foreground md:block">⌘K</span>
      {/if}
    </div>
    <button
      type="button"
      onclick={() => (filterOpen = true)}
      aria-label={filter === FilterKey.All ? 'ตัวกรองรายการ' : `ตัวกรองรายการ: ${FILTER_LABELS[filter]}`}
      aria-expanded={filterOpen}
      aria-haspopup="dialog"
      class="relative grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground {filter === FilterKey.All ? '' : '!border-primary/40 !text-primary'}"
    >
      <Funnel class="h-5 w-5" weight={filter === FilterKey.All ? 'regular' : 'fill'} aria-hidden />
      {#if filter !== FilterKey.All}
        <span class="absolute right-2 top-2 size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
      {/if}
    </button>
  </div>

  <AppDialog open={filterOpen} onClose={() => (filterOpen = false)} title="ตัวกรองรายการ">
    <div class="flex flex-col gap-1 p-4">
      {#each FILTER_CHOICES as choice}
        <button
          type="button"
          onclick={() => {
            setFilter(choice.key)
            focused = 0
            filterOpen = false
          }}
          aria-pressed={filter === choice.key}
          class="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors {filter === choice.key ? 'bg-primary/12 font-medium text-primary' : 'text-foreground hover:bg-muted'}"
        >
          <span>{FILTER_LABELS[choice.key]}</span>
          <span class="font-mono text-xs opacity-60">{choice.count()}</span>
        </button>
      {/each}
    </div>
  </AppDialog>

  {#if offline}
    <p class="mt-3 shrink-0 rounded-xl border border-border bg-muted px-3 py-2 text-center text-xs text-muted-foreground" role="status">อยู่ออฟไลน์ — กำลังแสดงข้อมูลที่บันทึกไว้</p>
  {/if}
  {#if error && filtered.length === 0}
    <div class="mt-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
      <span>โหลดรายการไม่สำเร็จ</span>
      <button type="button" onclick={retry} class="shrink-0 rounded-full border border-destructive/40 px-3 py-1.5 text-xs hover:bg-destructive/10">ลองใหม่</button>
    </div>
  {/if}

  <div class="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    {#if loading && filtered.length === 0}
      <div class="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดรายการ…</div>
    {:else if filtered.length === 0}
      <div class="flex h-full items-center justify-center p-8 text-center text-sm opacity-50">{error ? 'โหลดรายการไม่สำเร็จ' : 'ไม่พบรายการ — ลองล้างการค้นหาหรือเปลี่ยนตัวกรอง'}</div>
    {:else}
      <div bind:this={parentRef} class="h-full overflow-auto overscroll-contain">
        <div style="height: {$vstore?.getTotalSize() ?? 0}px; position: relative;">
          {#each $vstore?.getVirtualItems() ?? [] as vi (filtered[vi.index]?.id ?? vi.index)}
            {@const c = filtered[vi.index]}
            <!-- The virtualizer keeps its previous range for one frame after
                 setOptions({ count }), so a filter that shrinks the list can
                 hand us an index that is already out of bounds. -->
            {#if c}
              <CatalogRow
                client={c}
                active={vi.index === focused}
                index={vi.index}
                onOpen={() => push(`/c/${encodeURIComponent(c.id)}`)}
                onFocus={() => (focused = vi.index)}
                measureElement={(node) => vstore && get(vstore).measureElement(node)}
                style="position: absolute; left: 0; top: 0; width: 100%; transform: translateY({vi.start}px);"
              />
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
