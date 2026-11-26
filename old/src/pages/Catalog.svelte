<script lang="ts">
  import { MagnifyingGlass, X, ArrowsClockwise, Clock, TextAa, Asterisk } from 'phosphor-svelte'
  import { push } from 'svelte-spa-router'
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  import { useClientStore } from '@/stores/client-store'
  import { useFilterStore } from '@/stores/filter-store'
  import { FilterKey } from '@/types/index'
  import { applyCounts, applyFilter, sortByCreatedDesc } from '@/lib/filter'
  import { get } from 'svelte/store'
  import { trackField } from '@/lib/restore-field'
  import { clientListTitle } from '@/lib/clientNames'
  import CatalogRow from '@/components/CatalogRow.svelte'
  import Chip from '@/components/ui/Chip.svelte'

  let clients = $derived($useClientStore.clients)
  let loading = $derived($useClientStore.loading)
  let error = $derived($useClientStore.error)
  let refresh = $derived($useClientStore.refresh)
  let refreshing = $derived($useClientStore.refreshing)
  let search = $derived($useFilterStore.search)
  let setSearch = $derived($useFilterStore.setSearch)
  let filter = $derived($useFilterStore.filter)
  let setFilter = $derived($useFilterStore.setFilter)
  let recentCutoff = $derived($useFilterStore.recentCutoff)

  let query = $derived(search.trim().toLowerCase())
  let counts = $derived(applyCounts(clients, recentCutoff))
  let sort = $state<'updated' | 'name'>('updated')
  let filtered = $derived.by(() => {
    const result = applyFilter(clients, query, filter, recentCutoff)
    if (sort === 'name') {
      return [...result].sort((a, b) => clientListTitle(a).localeCompare(clientListTitle(b), 'th'))
    }
    return sortByCreatedDesc(result)
  })

  let focused = $state(0)
  const readSearch = () => search

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

  // Keep filter counts beside the list so the full catalog stays scannable.
  const FILTER_CHOICES = [
    { key: FilterKey.All, count: () => counts.total },
    { key: FilterKey.WithImages, count: () => counts.withImages },
    { key: FilterKey.NoImages, count: () => counts.noImages },
    { key: FilterKey.Notes, count: () => counts.notes },
    { key: FilterKey.Recent, count: () => counts.recent },
    { key: FilterKey.Penpay, count: () => counts.penpay },
    { key: FilterKey.Credit, count: () => counts.credit },
  ]

  // The catalog used to scroll inside its own card, which made the page feel
  // stuck (and swallowed the browser's pull-to-refresh). It now scrolls with
  // the page: <main id="ledger-main"> is the only scroller, so the virtualiser
  // has to measure in that coordinate space. `scrollMargin` is the distance
  // from the top of <main>'s scroll content to this list — i.e. the height of
  // everything rendered above it (header, chips, sticky search, error).
  let parentRef: HTMLDivElement | undefined = $state()
  let topRef: HTMLDivElement | undefined = $state()
  let vstore: ReturnType<typeof createVirtualizer<HTMLElement, HTMLDivElement>> | undefined = $state()
  let scrollMargin = $state(0)
  let appliedMargin = -1

  const scrollRoot = () => document.getElementById('ledger-main')

  function measureScrollMargin() {
    const scroller = scrollRoot()
    if (!parentRef || !scroller) return scrollMargin
    const offset = parentRef.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    return Math.max(0, Math.round(offset))
  }

  $effect(() => {
    const scroller = scrollRoot()
    if (!parentRef || !scroller) return
    if (vstore) {
      if (appliedMargin !== scrollMargin) {
        appliedMargin = scrollMargin
        get(vstore).setOptions({ scrollMargin })
      }
      return
    }
    appliedMargin = scrollMargin
    vstore = createVirtualizer<HTMLElement, HTMLDivElement>({
      count: filtered.length,
      getScrollElement: () => scroller,
      scrollMargin,
      // Keep keyboard-driven scrollToIndex clear of the sticky search bar.
      scrollPaddingStart: 76,
      estimateSize: () => 64,
      overscan: 10,
    })
  })

  // Anything above the list can change height — the header wraps on narrow
  // screens, the filter chips wrap, the sticky bar grows with the
  // font — so track those boxes instead of measuring once.
  const syncMargin = () => {
    const next = measureScrollMargin()
    if (next !== scrollMargin) scrollMargin = next
  }

  $effect(() => {
    const boxes = [topRef].filter((n): n is HTMLDivElement => !!n)
    if (!boxes.length || !parentRef) return
    const ro = new ResizeObserver(syncMargin)
    for (const box of boxes) ro.observe(box)
    return () => ro.disconnect()
  })

  // The error banner adds height without resizing a tracked box.
  $effect(() => {
    void error
    syncMargin()
  })

  $effect(() => {
    const count = filtered.length
    if (vstore) get(vstore).setOptions({ count })
  })

  // Only follow the focused row when the keyboard drove the change — doing it
  // on mount scrolled the page down before the user touched anything.
  let keyboardNav = $state(false)

  $effect(() => {
    if (!keyboardNav || filtered.length === 0 || !vstore) return
    try {
      get(vstore).scrollToIndex(focused, { align: 'auto' })
    } catch {
      /* index can lag a filtered list */
    }
  })

  function onKeyDown(e: KeyboardEvent) {
    keyboardNav = true
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

  const handleRefresh = async () => {
    await refresh().catch(() => undefined)
  }
</script>

<section class="catalog wrap page-shell page-shell--catalog">
  <header class="catalog-head">
    <div><span class="eyebrow"><Asterisk size={13} weight="fill" aria-hidden="true" /> สมุดทะเบียน</span><h1>รายการทั้งหมด</h1></div>
    <div class="head-count"><strong class="tnum">{filtered.length}</strong><span>จาก {counts.total} รายการ</span></div>
  </header>
  <div class="toolbar">
    <div class="search-wrap sticky">
      <span class="search-icon"><MagnifyingGlass aria-hidden="true" /></span>
      <input use:trackField={readSearch} value={search} oninput={(e) => { setSearch(e.currentTarget.value); focused = 0 }} onkeydown={onKeyDown} placeholder="ค้นหาชื่อร้าน, ลูกค้า, โน้ต…" aria-label="ค้นหาชื่อร้าน ลูกค้า หรือโน้ต" name="q" autocomplete="off" spellcheck="false" />
      {#if search}<button type="button" class="clear-search" aria-label="ล้างคำค้น" onclick={() => { setSearch(''); focused = 0 }}><X size={15} /></button>{:else}<kbd>⌘ K</kbd>{/if}
    </div>
    <div class="seg shrink-0" role="group" aria-label="เรียงลำดับรายการ">
      <button type="button" class="seg-item" aria-pressed={sort === 'updated'} onclick={() => (sort = 'updated')}><Clock size={13} aria-hidden="true" /> ล่าสุด</button>
      <button type="button" class="seg-item" aria-pressed={sort === 'name'} onclick={() => (sort = 'name')}><TextAa size={13} aria-hidden="true" /> ชื่อ</button>
    </div>
    <button type="button" onclick={handleRefresh} disabled={refreshing} aria-label="รีเฟรชรายการ" class="refresh-btn"><ArrowsClockwise size={16} class={refreshing ? 'spin' : ''} /></button>
  </div>
  <div bind:this={topRef} class="chips" role="group" aria-label="ตัวกรองรายการ">
    {#each FILTER_CHOICES as choice}
      <Chip
        active={filter === choice.key}
        count={choice.count()}
        onclick={() => { setFilter(choice.key); focused = 0 }}
      >{FILTER_LABELS[choice.key]}</Chip>
    {/each}
  </div>

  <!-- Search/filter composition follows the attached Ledger view. -->


  {#if error && filtered.length === 0}
    <div class="mt-3 flex items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-danger bg-danger-tint px-3 py-2 text-sm text-danger-ink" role="alert">
      <span>โหลดรายการไม่สำเร็จ</span>
      <button type="button" onclick={retry} class="btn btn-danger shrink-0 !px-3.5 !py-2 text-xs">ลองใหม่</button>
    </div>
  {/if}

  <div class="list-shell">
    <div class="list-head" aria-hidden="true"><span>ลูกค้า</span><span>สถานะ</span><span class="right">อัปเดต</span><span></span></div>
    <div class="list-body">
      {#if loading && filtered.length === 0}
        <div role="status" aria-label="กำลังโหลดรายการ" class="p-2">
          {#each Array(6) as _, i (i)}
            <div class="flex items-center gap-3 border-b border-dashed border-rule px-3 py-3.5 last:border-b-0"><span class="size-11 shrink-0 animate-pulse rounded-full bg-paper-2"></span><span class="flex flex-1 flex-col gap-2"><span class="h-3 w-1/2 animate-pulse rounded bg-paper-2"></span><span class="h-2.5 w-1/3 animate-pulse rounded bg-paper-2"></span></span><span class="h-5 w-12 animate-pulse rounded bg-paper-2"></span></div>
          {/each}
        </div>
      {:else if filtered.length === 0}
        <div class="empty-state"><div class="empty-art"><MagnifyingGlass size={26} /></div><h2>{error ? 'โหลดรายการไม่สำเร็จ' : 'ไม่พบรายการ'}</h2><p>ลองเปลี่ยนคำค้นหา หรือยกเลิกตัวกรองดูสิ</p><button type="button" onclick={() => { setSearch(''); setFilter(FilterKey.All) }}>ล้างทั้งหมด</button></div>
      {:else}
        <div bind:this={parentRef} class="relative">
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
                  style="position: absolute; left: 0; top: 0; width: 100%; transform: translateY({vi.start - scrollMargin}px);"
                />
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .catalog { padding-top:22px; padding-bottom:60px; }
  .catalog-head { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; padding-bottom:16px; border-bottom:2px solid var(--rule-2); }
  .eyebrow { display:inline-flex; align-items:center; gap:6px; color:var(--pri); font-size:var(--fs-xs); font-weight:700; letter-spacing:.08em; }
  .catalog-head h1 { margin-top:4px; font-family:var(--font-display); font-size:var(--fs-2xl); font-weight:700; }
  .head-count { display:flex; align-items:baseline; gap:6px; white-space:nowrap; color:var(--ink-faint); font-size:var(--fs-sm); }
  .head-count strong { color:var(--pri); font-family:var(--font-display); font-size:var(--fs-xl); }
  .toolbar { display:flex; align-items:center; gap:10px; margin-top:14px; }
  .search-wrap { display:flex; align-items:center; gap:9px; min-width:0; flex:1; height:40px; padding:0 10px 0 13px; border:1px solid var(--rule-2); border-radius:var(--r-pill); background:var(--card); }
  .search-icon { width:16px; flex:none; color:var(--ink-faint); }
  .search-wrap input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--ink); font:inherit; font-size:var(--fs-sm); }
  .search-wrap input::placeholder { color:var(--ink-faint); }
  .search-wrap kbd { flex:none; border:1px solid var(--rule); border-radius:6px; padding:1px 5px; color:var(--ink-faint); font:11px var(--font-mono); }
  .clear-search,.refresh-btn { display:grid; place-items:center; width:36px; height:36px; flex:none; border:1px solid var(--rule); border-radius:50%; background:var(--card); color:var(--ink-soft); }
  .chips { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
  .list-shell { margin-top:16px; overflow:hidden; border:1px solid var(--rule); border-radius:var(--r-md); background:var(--paper-2); }
  .list-head { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) 96px 34px; gap:14px; padding:9px 16px; border-bottom:1px solid var(--rule); background:var(--paper-3); color:var(--ink-faint); font-size:var(--fs-2xs); font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
  .list-head .right { text-align:right; }
  .empty-state { display:flex; flex-direction:column; align-items:center; gap:8px; padding:48px 20px; text-align:center; color:var(--ink-soft); }
  .empty-art { display:grid; place-items:center; width:58px; height:58px; margin-bottom:4px; border-radius:var(--r-md); background:var(--paper-3); color:var(--pri); }
  .empty-state h2 { color:var(--ink); font-family:var(--font-display); font-size:var(--fs-lg); }
  .empty-state p { font-size:var(--fs-sm); }
  .empty-state button { border:0; background:none; color:var(--pri); font-size:var(--fs-sm); font-weight:700; }
  @media(max-width:680px) { .catalog { padding-inline:14px; } .catalog-head { align-items:flex-start; } .toolbar { flex-wrap:wrap; } .search-wrap { flex-basis:calc(100% - 48px); } .list-head { grid-template-columns:minmax(0,1fr) 30px; } .list-head span:nth-child(2),.list-head .right { display:none; } }
</style>
