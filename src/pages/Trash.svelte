<script lang="ts">
  import { push, replace } from 'svelte-spa-router'
  import { Info, Trash } from 'phosphor-svelte'
  import { useAuthStore } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { treatyClient, treatyHeaders } from '@/lib/treaty'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import AppDialog from '@/components/AppDialog.svelte'
  import Asterisk from '@/components/ui/Asterisk.svelte'
  import CountSticker from '@/components/ui/CountSticker.svelte'
  import Squiggle from '@/components/ui/Squiggle.svelte'
  import { formatDateTime } from '@/lib/utils'

  interface TrashItem {
    id: string
    name: string[]
    shopName: string[]
    branch: string
    images: string[]
    badge: string | null
    deletedAt: number
  }

  let isAdmin = $derived($useAuthStore.isAdmin)
  let checking = $derived($useAuthStore.checking)
  let refresh = $derived($useClientStore.refresh)

  let items = $state<TrashItem[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let confirm = $state<TrashItem | null>(null)
  let busyId = $state<string | null>(null)
  let focused = $state(0)
  let rowEls: (HTMLButtonElement | null)[] = []

  async function fetchTrash() {
    loading = true
    error = null
    try {
      const { data, error: requestError } = await treatyClient.api.clients.trash.get({ headers: await treatyHeaders() })
      if (!requestError && data) items = data as unknown as TrashItem[]
      else error = 'โหลดถังขยะไม่สำเร็จ'
    } catch {
      error = 'โหลดถังขยะไม่สำเร็จ'
    } finally {
      loading = false
    }
  }

  $effect(() => {
    if (isAdmin) void fetchTrash()
  })

  $effect(() => {
    items.length
    focused = Math.min(focused, Math.max(items.length - 1, 0))
  })

  const TTL_DAYS = 30
  const daysLeft = (deletedAt: number) => Math.max(0, TTL_DAYS - Math.floor((Date.now() - deletedAt) / 86_400_000))

  function focusRow(index: number) {
    focused = index
    rowEls[index]?.focus()
  }

  async function restore(id: string) {
    if (busyId) return
    busyId = id
    error = null
    try {
      const { error: requestError } = await treatyClient.api.clients.trash.post({ id }, { query: { action: 'restore' }, headers: await treatyHeaders() })
      if (!requestError) {
        items = items.filter((item) => item.id !== id)
        void refresh().catch(() => undefined)
      } else error = 'กู้คืนไม่สำเร็จ'
    } catch {
      error = 'กู้คืนไม่สำเร็จ'
    } finally {
      busyId = null
    }
  }

  async function forceDelete(id: string) {
    if (busyId) return
    busyId = id
    error = null
    try {
      const { error: requestError } = await treatyClient.api.clients.trash.post({ id }, { query: { action: 'force-delete' }, headers: await treatyHeaders() })
      if (!requestError) items = items.filter((item) => item.id !== id)
      else error = 'ลบไม่สำเร็จ'
    } catch {
      error = 'ลบไม่สำเร็จ'
    } finally {
      busyId = null
      confirm = null
    }
  }

  function onRowKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusRow(Math.min(index + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusRow(Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      void restore(items[index].id)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      confirm = items[index]
    }
  }

  $effect(() => {
    if (!checking && !isAdmin) replace('/')
  })
</script>

{#if checking}
  <div class="p-8 text-center text-sm text-ink-soft" role="status">กำลังตรวจสิทธิ์…</div>
{:else if !isAdmin}
  <div class="p-8 text-center text-sm text-ink-soft" role="status">กำลังนำกลับ…</div>
{:else}
  <section class="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6">
    <div class="flex items-center gap-4">
      <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">ถังขยะ</h1>
      <CountSticker n={items.length} label="พักอยู่" rot={-2} />
    </div>
    <Squiggle class="mt-2 h-[6px] w-32 text-danger" />

    <div class="sticker mt-7 flex -rotate-[0.6deg] items-start gap-3 rounded-2xl !border-acc bg-tint p-4 shadow-[3px_3px_0_0_var(--acc)]">
      <Info size={17} weight="bold" class="mt-0.5 shrink-0 text-acc-ink" aria-hidden="true" />
      <p class="text-[13.5px] font-medium leading-relaxed text-acc-ink">รายการที่ลบจะอยู่ที่นี่ 30 วัน แล้วถูกลบถาวร</p>
    </div>

    <div class="mt-8 flex items-center justify-between gap-3 text-xs font-semibold text-ink-faint">
      <span class="mono" role="status">{loading ? 'กำลังโหลด…' : `${items.length} รายการ`}</span>
      <span class="mono hidden sm:block">↑↓ เลือก · Enter กู้คืน</span>
    </div>

    {#if error}
      <p role="alert" class="mt-4 rounded-xl border-[1.5px] border-danger bg-danger-tint px-4 py-3 text-sm font-medium text-danger-ink">{error}</p>
    {/if}

    <div role="list" aria-label="รายการถังขยะ" class="card mt-4 overflow-hidden">
      {#if loading}
        <div class="p-8 text-center text-sm text-ink-soft" role="status">กำลังโหลดถังขยะ…</div>
      {:else if items.length === 0 && !error}
        <div class="flex flex-col items-center gap-3 p-10 text-center">
          <span class="sticker grid size-16 place-items-center rounded-2xl bg-tint text-acc-ink shadow-[4px_4px_0_0_var(--acc)]" aria-hidden="true">
            <Asterisk class="size-8" />
          </span>
          <p class="text-lg font-bold text-ink">ถังขยะว่าง</p>
          <p class="text-sm text-ink-soft">รายการที่ลบจะมาอยู่ที่นี่</p>
          <button type="button" onclick={() => push('/')} class="btn btn-acc mt-2">กลับไปหน้ารายการ</button>
        </div>
      {:else}
        {#each items as item, index (item.id)}
          {@const active = index === focused}
          <div role="listitem" onmouseenter={() => (focused = index)} class="row grid-cols-[minmax(0,1fr)_auto] px-4 sm:px-5 {active ? 'is-active' : ''}">
            <button
              bind:this={rowEls[index]}
              type="button"
              onfocus={() => (focused = index)}
              onkeydown={(event) => onRowKeyDown(event, index)}
              onclick={() => void restore(item.id)}
              class="flex min-w-0 items-center gap-3 py-2 text-left"
              aria-label={`กู้คืน ${item.shopName[0] || item.name[0] || item.id}`}
            >
              {#if item.images[0]}
                <AppImage src={item.images[0]} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl border-[1.5px] border-rule object-cover" />
              {:else}
                <span aria-hidden="true" class="flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-rule bg-tint text-base font-bold text-acc-ink">{(item.shopName[0] || item.name[0] || '·').trim().charAt(0).toUpperCase()}</span>
              {/if}
              <span class="min-w-0 flex-1">
                <ClientNames client={item} variant="list" titleClassName="truncate py-0.5 text-[14.5px] font-bold leading-6 text-ink" subClassName="truncate py-0.5 text-xs leading-5 text-ink-faint" />
                <span class="mono block truncate py-0.5 text-[11.5px] text-ink-faint">ลบเมื่อ {formatDateTime(item.deletedAt)}</span>
              </span>
              <span class="chip hidden shrink-0 whitespace-nowrap sm:inline-flex {daysLeft(item.deletedAt) <= 7 ? 'bg-banana/20 text-ink' : 'bg-paper-2 text-ink-faint'}">เหลือ {daysLeft(item.deletedAt)} วัน</span>
            </button>
            <div class="flex shrink-0 items-center gap-1.5 pr-3">
              <button type="button" disabled={busyId === item.id} onclick={() => void restore(item.id)} class="btn btn-pop !px-3.5 !py-2 text-[13px]">กู้คืน</button>
              <button type="button" disabled={busyId === item.id} onclick={() => (confirm = item)} aria-label={`ลบ ${item.shopName[0] || item.name[0] || item.id} ถาวร`} class="btn btn-danger !p-0 size-11">
                <Trash size={16} weight="bold" aria-hidden="true" />
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <AppDialog open={confirm !== null} onClose={() => { if (!busyId) confirm = null }} title="ลบถาวร" showHeader>
      {#if confirm}
        <div class="p-6">
          <p class="mt-2 text-sm text-ink-soft">“{confirm.shopName[0] || confirm.name[0] || confirm.id.slice(0, 8)}” จะหายถาวร และไม่สามารถกู้คืนได้</p>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" onclick={() => (confirm = null)} disabled={busyId !== null} class="btn btn-pop">ยกเลิก</button>
            <button type="button" disabled={busyId !== null} onclick={() => void forceDelete(confirm!.id)} class="btn btn-danger">{busyId === confirm.id ? 'กำลังลบ…' : 'ลบถาวร'}</button>
          </div>
        </div>
      {/if}
    </AppDialog>
  </section>
{/if}
