<script lang="ts">
  import { MagnifyingGlass, X, ArrowsClockwise, FunnelSimple, Plus, Clock, TextAa } from 'phosphor-svelte'
  import { push } from 'svelte-spa-router'
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  import { useClientStore } from '@/stores/client-store'
  import { useFilterStore } from '@/stores/filter-store'
  import { FilterKey } from '@/types/index'
  import { applyCounts, applyFilter, sortByCreatedDesc } from '@/lib/filter'
  import { get } from 'svelte/store'
  import { trackField } from '@/lib/restore-field'
  import ClientNames from '@/components/ClientNames.svelte'
  import { clientTitleValues } from '@/lib/clientNames'
  import { useAuthStore } from '@/stores/auth-store'
  import { formatDate } from '@/lib/utils'
  import AppDialog from '@/components/AppDialog.svelte'
  import CatalogRow from '@/components/CatalogRow.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import CountSticker from '@/components/ui/CountSticker.svelte'
  import Squiggle from '@/components/ui/Squiggle.svelte'
  import Chip from '@/components/ui/Chip.svelte'
  import Monogram from '@/components/ui/Monogram.svelte'

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
      return [...result].sort((a, b) => (clientTitleValues(a)[0] ?? '').localeCompare(clientTitleValues(b)[0] ?? '', 'th'))
    }
    return sortByCreatedDesc(result)
  })

  let sheetOpen = $state(false)
  let focused = $state(0)
  let isAdmin = $derived($useAuthStore.isAdmin)
  let current = $derived(filtered[focused])
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

  const handleRefresh = async () => {
    await refresh().catch(() => undefined)
  }
</script>

<div class="mx-auto flex h-full max-w-6xl flex-col overflow-hidden px-3 pt-3 sm:px-8 sm:pt-5">
  <div class="flex shrink-0 flex-wrap items-end justify-between gap-3 pb-4">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">รายการ</h1>
        <span role="status"><CountSticker n={counts.total.toLocaleString('th-TH')} label="รายการ" /></span>
      </div>
      <Squiggle class="mt-2 h-[6px] w-36 text-acc" />
      <p class="mt-2 text-sm text-ink-soft">ทุกรายการในสมุดทะเบียน — ค้นหา กรอง เปิด และคัดลอก</p>
    </div>
    {#if isAdmin}
      <button type="button" onclick={() => push('/add')} class="btn btn-acc shrink-0">
        <Plus size={17} weight="bold" aria-hidden="true" /> เพิ่มรายการ
      </button>
    {/if}
  </div>

  <div class="flex shrink-0 gap-2">
    <div class="relative min-w-0 flex-1">
      <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <input
        use:trackField={readSearch}
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
        class="field !py-3 !pl-11 !pr-20 shadow-[2.5px_2.5px_0_0_var(--rule)]"
      />
      {#if search}
        <button type="button" onclick={() => { setSearch(''); focused = 0 }} class="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink-faint hover:bg-paper-2 hover:text-ink" aria-label="ล้างการค้นหา">
          <X class="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
        </button>
      {:else}
        <span class="absolute right-3 top-1/2 hidden -translate-y-1/2 md:block"><kbd class="kbd">⌘K</kbd></span>
      {/if}
    </div>
    <button type="button" onclick={handleRefresh} disabled={refreshing} aria-label="รีเฟรชรายการ" class="btn btn-pop grid size-12 shrink-0 place-items-center !p-0">
      <ArrowsClockwise class="h-5 w-5 {refreshing ? 'spin' : ''}" weight="bold" aria-hidden="true" />
    </button>
  </div>

  <div class="flex shrink-0 items-center gap-2 pt-3">
    <button type="button" onclick={() => (sheetOpen = true)} class="btn btn-pop shrink-0 sm:hidden"><FunnelSimple size={16} aria-hidden="true" /> ตัวกรอง · {FILTER_LABELS[filter]}</button>
    <div class="seg ml-auto shrink-0" role="group" aria-label="เรียงลำดับรายการ">
      <button type="button" class="seg-item" aria-pressed={sort === 'updated'} onclick={() => (sort = 'updated')}><Clock size={13} class="mr-1 inline -translate-y-px" weight="bold" aria-hidden="true" /> ล่าสุด</button>
      <button type="button" class="seg-item" aria-pressed={sort === 'name'} onclick={() => (sort = 'name')}><TextAa size={13} class="mr-1 inline -translate-y-px" weight="bold" aria-hidden="true" /> ชื่อ</button>
    </div>
  </div>

  <div class="-mx-3 mt-3 hidden shrink-0 gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex sm:px-0" role="group" aria-label="ตัวกรองรายการ">
    {#each FILTER_CHOICES as choice}
      <Chip
        active={filter === choice.key}
        count={choice.count()}
        onclick={() => { setFilter(choice.key); focused = 0 }}
      >{FILTER_LABELS[choice.key]}</Chip>
    {/each}
  </div>

  {#if error && filtered.length === 0}
    <div class="mt-3 flex shrink-0 items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-danger bg-danger-tint px-3 py-2 text-sm text-danger-ink" role="alert">
      <span>โหลดรายการไม่สำเร็จ</span>
      <button type="button" onclick={retry} class="btn btn-danger shrink-0 !px-3.5 !py-2 text-xs">ลองใหม่</button>
    </div>
  {/if}

  <div class="mt-4 grid min-h-0 flex-1 gap-4 pb-3 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div class="card flex min-h-0 flex-col overflow-hidden">
      <div class="hidden shrink-0 items-center gap-3 border-b border-rule bg-paper-2/50 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint sm:flex" aria-hidden="true">
        <span class="w-11">รูป</span><span class="flex-1">ลูกค้า</span><span class="w-[72px]">ชำระ</span><span class="w-12">มี</span><span class="hidden w-24 text-right md:block">อัปเดต</span><span class="w-11"></span>
      </div>
      {#if loading && filtered.length === 0}
        <div role="status" aria-label="กำลังโหลดรายการ" class="p-2">
          {#each Array(6) as _, i (i)}
            <div class="flex items-center gap-3 border-b border-dashed border-rule px-3 py-3.5 last:border-b-0"><span class="size-11 shrink-0 animate-pulse rounded-full bg-paper-2"></span><span class="flex flex-1 flex-col gap-2"><span class="h-3 w-1/2 animate-pulse rounded bg-paper-2"></span><span class="h-2.5 w-1/3 animate-pulse rounded bg-paper-2"></span></span><span class="h-5 w-12 animate-pulse rounded bg-paper-2"></span></div>
          {/each}
        </div>
      {:else if filtered.length === 0}
        <div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <Squiggle class="h-1.5 w-24 text-rule-2" />
          <p class="text-sm text-ink-soft">{error ? 'โหลดรายการไม่สำเร็จ' : 'ไม่พบรายการ — ลองล้างการค้นหาหรือเปลี่ยนตัวกรอง'}</p>
        </div>
      {:else}
        <div bind:this={parentRef} class="min-h-0 flex-1 overflow-auto overscroll-contain">
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
      <div class="flex shrink-0 items-center justify-between gap-3 border-t border-rule px-5 py-2.5 text-xs text-ink-faint">
        <span>แสดง {filtered.length.toLocaleString('th-TH')} จาก {counts.total.toLocaleString('th-TH')} รายการ</span>
        <span class="hidden font-mono sm:block">↑ ↓ เลือก · Enter เปิด</span>
      </div>
    </div>

    <aside class="hidden min-h-0 flex-col gap-4 overflow-auto lg:flex" aria-label="ตัวอย่างระเบียน">
      {#if current}
        <div class="sticker overflow-hidden rounded-3xl">
          {#if current.images[0]}
            <div class="h-36 w-full overflow-hidden border-b-[1.5px] border-ink">
              <AppImage src={current.thumb ?? current.images[0]} fallbackSrc={current.thumb ? current.images[0] : undefined} alt="" className="size-full object-cover" />
            </div>
          {:else}
            <div class="grid h-36 place-items-center border-b-[1.5px] border-dashed border-rule-2 bg-paper-2/60">
              <Monogram name={clientTitleValues(current)[0] ?? ''} size={64} class="!rounded-2xl" />
            </div>
          {/if}
          <div class="space-y-3.5 p-5">
            <div class="min-w-0">
              <ClientNames client={current} variant="list" titleClassName="truncate text-[17px] font-extrabold leading-snug text-ink" subClassName="truncate text-[12.5px] text-ink-soft" />
            </div>
            <dl class="space-y-3 text-sm text-ink">
              <div><dt class="label !mb-1">ID</dt><dd class="break-all font-mono text-xs text-ink-soft">{current.id}</dd></div>
              <div><dt class="label !mb-1">ประเภทชำระ</dt><dd class="mt-0.5">{current.badge === 'credit' ? 'บัตรเครดิต' : current.badge === 'penpay' ? 'จ่ายในวัน' : '—'}</dd></div>
              <div><dt class="label !mb-1">โน้ต</dt><dd class="mt-0.5">{current.hasNotes || current.notes?.trim() ? 'มีโน้ต' : 'ยังไม่มีโน้ต'}</dd></div>
              <div><dt class="label !mb-1">อัปเดตล่าสุด</dt><dd class="mt-0.5 font-mono text-xs text-ink-soft">{formatDate(current.updatedAt)}</dd></div>
            </dl>
            <div class="flex flex-col gap-2">
              <button type="button" onclick={() => push(`/c/${encodeURIComponent(current.id)}`)} class="btn btn-acc w-full">เปิดระเบียน</button>
              {#if isAdmin}
                <button type="button" onclick={() => push(`/edit/${encodeURIComponent(current.id)}`)} class="btn btn-pop w-full">แก้ไข</button>
              {/if}
            </div>
          </div>
        </div>
      {:else}
        <div class="card m-auto border-dashed p-6 text-center text-sm text-ink-faint">เลือกรายการเพื่อดูตัวอย่าง</div>
      {/if}
    </aside>
  </div>
</div>

<AppDialog open={sheetOpen} onClose={() => (sheetOpen = false)} title="ตัวกรอง" variant="sheet" showHeader>
  <div class="p-4 pb-6">
    <div class="flex flex-wrap gap-2" role="group" aria-label="ตัวกรองรายการ">
      {#each FILTER_CHOICES as choice}
        <button type="button" onclick={() => { setFilter(choice.key); focused = 0 }} aria-pressed={filter === choice.key} class="chip cursor-pointer !py-2 transition-all duration-150 {filter === choice.key ? 'border-[1.5px] border-ink bg-ink text-paper shadow-[2px_2px_0_0_var(--acc)]' : 'border-[1.5px] border-rule-2 bg-card text-ink-soft'}">
          {FILTER_LABELS[choice.key]}<span class="rounded-full px-1.5 font-mono text-[10.5px] font-bold {filter === choice.key ? 'bg-paper/20 text-paper' : 'bg-paper-2 text-ink-faint'}">{choice.count()}</span>
        </button>
      {/each}
    </div>
    <button type="button" onclick={() => (sheetOpen = false)} class="btn btn-acc mt-5 w-full">แสดง {filtered.length.toLocaleString('th-TH')} รายการ</button>
  </div>
</AppDialog>
