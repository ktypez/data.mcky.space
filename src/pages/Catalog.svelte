<script lang="ts">
  import { MagnifyingGlass, X, ArrowsClockwise } from 'phosphor-svelte'
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
  import CatalogRow from '@/components/CatalogRow.svelte'

  let clients = $derived($useClientStore.clients)
  let loading = $derived($useClientStore.loading)
  let error = $derived($useClientStore.error)
  let offline = $derived($useClientStore.offline)
  let refresh = $derived($useClientStore.refresh)
  let refreshing = $derived($useClientStore.refreshing)
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

<div class="mx-auto flex h-full max-w-6xl flex-col overflow-hidden px-3 pt-5 sm:px-8 sm:pt-6">
    <div class="flex shrink-0 items-end justify-between gap-3 pb-3">
      <div>
        <p class="ledger-eyebrow">แคตตาล็อก</p>
        <h1 class="text-[clamp(22px,6vw,28px)] font-bold tracking-tight">รายการลูกค้า</h1>
      </div>
      <p class="font-mono text-xs text-muted-foreground" role="status">{counts.total.toLocaleString('th-TH')} รายการ</p>
    </div>
    <div class="flex shrink-0 gap-2">
      <div class="relative min-w-0 flex-1">
        <MagnifyingGlass class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden />
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
          class="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {#if search}
          <button type="button" onclick={() => { setSearch(''); focused = 0 }} class="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground" aria-label="ล้างการค้นหา">
            <X class="h-3.5 w-3.5" weight="bold" aria-hidden />
          </button>
        {:else}
          <kbd class="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:block">⌘K</kbd>
        {/if}
      </div>
      <button type="button" onclick={handleRefresh} disabled={refreshing} aria-label="รีเฟรชรายการ" class="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50">
        <ArrowsClockwise class="h-5 w-5 {refreshing ? 'animate-spin' : ''}" weight="bold" aria-hidden />
      </button>
    </div>

    <div class="-mx-3 mt-3 flex shrink-0 gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="ตัวกรองรายการ">
      {#each FILTER_CHOICES as choice}
        <button
          type="button"
          onclick={() => { setFilter(choice.key); focused = 0 }}
          aria-pressed={filter === choice.key}
          class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors {filter === choice.key ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-muted'}"
        >
          {FILTER_LABELS[choice.key]}
          <span class="font-mono text-xs opacity-80">{choice.count()}</span>
        </button>
      {/each}
    </div>

    {#if offline}
      <p class="mt-3 shrink-0 rounded-[10px] border border-border bg-muted px-3 py-2 text-center text-xs text-muted-foreground" role="status">อยู่ออฟไลน์ — กำลังแสดงข้อมูลที่บันทึกไว้</p>
    {/if}
    {#if error && filtered.length === 0}
      <div class="mt-3 flex shrink-0 items-center justify-between gap-3 rounded-[10px] border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
        <span>โหลดรายการไม่สำเร็จ</span>
        <button type="button" onclick={retry} class="shrink-0 rounded-full border border-destructive/40 px-3 py-1.5 text-xs hover:bg-destructive/10">ลองใหม่</button>
      </div>
    {/if}

    <div class="mt-4 grid min-h-0 flex-1 gap-5 pb-3 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div class="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div class="ledger-colhead hidden shrink-0 items-center gap-3 border-b border-border px-5 py-2.5 sm:flex" aria-hidden="true">
        <span class="w-11">รูป</span><span class="flex-1">ลูกค้า</span><span class="w-[72px]">ชำระ</span><span class="w-12">มี</span><span class="hidden w-24 text-right md:block">อัปเดต</span><span class="w-11"></span>
      </div>
      {#if loading && filtered.length === 0}
        <div role="status" aria-label="กำลังโหลดรายการ" class="p-2">
          {#each Array(6) as _, i (i)}
            <div class="flex items-center gap-3 border-b border-border px-3 py-3.5 last:border-b-0"><span class="size-11 shrink-0 animate-pulse rounded-full bg-muted"></span><span class="flex flex-1 flex-col gap-2"><span class="h-3 w-1/2 animate-pulse rounded bg-muted"></span><span class="h-2.5 w-1/3 animate-pulse rounded bg-muted"></span></span><span class="h-5 w-12 animate-pulse rounded bg-muted"></span></div>
          {/each}
        </div>
      {:else if filtered.length === 0}
        <div class="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">{error ? 'โหลดรายการไม่สำเร็จ' : 'ไม่พบรายการ — ลองล้างการค้นหาหรือเปลี่ยนตัวกรอง'}</div>
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
      <div class="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
        <span>แสดง {filtered.length.toLocaleString('th-TH')} จาก {counts.total.toLocaleString('th-TH')} รายการ</span>
        <span class="hidden font-mono sm:block">↑ ↓ เลือก · Enter เปิด</span>
      </div>
    </div>

    <aside class="hidden min-h-0 flex-col gap-4 overflow-auto rounded-2xl border border-border bg-card p-5 lg:flex" aria-label="ตัวอย่างระเบียน">
      {#if current}
        <div class="flex items-center gap-3">
          <span aria-hidden="true" class="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-muted text-xl font-bold text-primary">{(clientTitleValues(current)[0] ?? '?').trim().charAt(0).toUpperCase() || '?'}</span>
          <div class="min-w-0">
            <ClientNames client={current} variant="list" titleClassName="truncate text-base font-bold" subClassName="truncate text-sm text-muted-foreground" />
          </div>
        </div>
        <dl class="space-y-3 text-sm">
          <div><dt class="ledger-eyebrow">ID</dt><dd class="mt-1 break-all font-mono text-xs">{current.id}</dd></div>
          <div><dt class="ledger-eyebrow">ประเภทชำระ</dt><dd class="mt-1">{current.badge === 'credit' ? 'บัตรเครดิต' : current.badge === 'penpay' ? 'จ่ายในวัน' : '—'}</dd></div>
          <div><dt class="ledger-eyebrow">โน้ต</dt><dd class="mt-1">{current.hasNotes || current.notes?.trim() ? 'มีโน้ต' : 'ยังไม่มีโน้ต'}</dd></div>
          <div><dt class="ledger-eyebrow">อัปเดตล่าสุด</dt><dd class="mt-1 font-mono text-xs">{formatDate(current.updatedAt)}</dd></div>
        </dl>
        <div class="mt-auto flex flex-col gap-2">
          <button type="button" onclick={() => push(`/c/${encodeURIComponent(current.id)}`)} class="min-h-11 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground">เปิดระเบียน</button>
          {#if isAdmin}
            <button type="button" onclick={() => push(`/edit/${encodeURIComponent(current.id)}`)} class="min-h-11 rounded-[10px] border border-border px-4 text-sm font-medium hover:bg-muted">แก้ไข</button>
          {/if}
        </div>
      {:else}
        <p class="m-auto text-center text-sm text-muted-foreground">เลือกรายการเพื่อดูตัวอย่าง</p>
      {/if}
    </aside>
    </div>
  </div>
