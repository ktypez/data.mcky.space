<script lang="ts">
  import { push, replace } from 'svelte-spa-router'
  import { useAuthStore } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { treatyClient, treatyHeaders } from '@/lib/treaty'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import AppDialog from '@/components/AppDialog.svelte'
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
  <div class="p-8 text-center text-sm text-muted-foreground" role="status">กำลังตรวจสิทธิ์…</div>
{:else if !isAdmin}
  <div class="p-8 text-center text-sm text-muted-foreground" role="status">กำลังนำกลับ…</div>
{:else}
  <section class="mx-auto max-w-3xl px-3 pb-6 pt-4 sm:px-8">
    <p class="mt-0.5 text-sm text-muted-foreground">รายการที่ลบจะอยู่ที่นี่ 30 วัน แล้วถูกลบถาวร</p>
    <div class="mb-4 mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span class="font-mono" role="status">{loading ? 'กำลังโหลด…' : `${items.length} รายการ`}</span>
      <span class="hidden font-mono sm:block">↑↓ เลือก · Enter กู้คืน</span>
    </div>
    {#if error}
      <p role="alert" class="mt-4 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
    {/if}

    <div role="list" aria-label="รายการถังขยะ" class="overflow-hidden rounded-2xl border border-border bg-card">
      {#if loading}
        <div class="p-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดถังขยะ…</div>
      {:else if items.length === 0 && !error}
        <div class="flex flex-col items-center gap-3 border-dashed p-10 text-center">
          <p class="text-sm font-semibold">ถังขยะว่าง</p>
          <p class="text-sm text-muted-foreground">รายการที่ลบจะมาอยู่ที่นี่</p>
          <button type="button" onclick={() => push('/')} class="min-h-11 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground">กลับไปหน้ารายการ</button>
        </div>
      {:else}
        {#each items as item, index (item.id)}
          {@const active = index === focused}
          <div role="listitem" onmouseenter={() => (focused = index)} class="flex items-center {active ? 'ledger-row-active' : 'hover:bg-muted/60'} border-b border-border last:border-b-0">
            <button
              bind:this={rowEls[index]}
              type="button"
              onfocus={() => (focused = index)}
              onkeydown={(event) => onRowKeyDown(event, index)}
              onclick={() => void restore(item.id)}
              class="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
              aria-label={`กู้คืน ${item.shopName[0] || item.name[0] || item.id}`}
            >
              {#if item.images[0]}
                <AppImage src={item.images[0]} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[10px] object-cover border border-border" />
              {:else}
                <span aria-hidden="true" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-muted text-base font-bold text-primary">{(item.shopName[0] || item.name[0] || '·').trim().charAt(0).toUpperCase()}</span>
              {/if}
              <span class="min-w-0 flex-1">
                <ClientNames client={item} variant="list" titleClassName="text-sm font-semibold truncate text-foreground" subClassName="text-xs truncate text-muted-foreground" />
                <span class="font-mono text-[10px] text-muted-foreground">ลบเมื่อ {formatDateTime(item.deletedAt)}</span>
              </span>
              <span class="hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex {daysLeft(item.deletedAt) <= 7 ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}">เหลือ {daysLeft(item.deletedAt)} วัน</span>
            </button>
            <div class="flex shrink-0 items-center gap-1 pr-3">
              <button type="button" disabled={busyId === item.id} onclick={() => void restore(item.id)} class="min-h-11 rounded-[10px] border border-border bg-card px-4 text-sm font-medium hover:bg-muted disabled:opacity-50">กู้คืน</button>
              <button type="button" disabled={busyId === item.id} onclick={() => (confirm = item)} aria-label={`ลบ ${item.shopName[0] || item.name[0] || item.id} ถาวร`} class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-destructive text-base font-bold leading-none text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50">×</button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <AppDialog open={confirm !== null} onClose={() => { if (!busyId) confirm = null }} title="ลบถาวร" showHeader>
      {#if confirm}
        <div class="p-6">
          <p class="mt-2 text-sm text-muted-foreground">“{confirm.shopName[0] || confirm.name[0] || confirm.id.slice(0, 8)}” จะหายถาวร และไม่สามารถกู้คืนได้</p>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" onclick={() => (confirm = null)} disabled={busyId !== null} class="min-h-11 rounded-[10px] border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">ยกเลิก</button>
            <button type="button" disabled={busyId !== null} onclick={() => void forceDelete(confirm!.id)} class="min-h-11 rounded-[10px] bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">{busyId === confirm.id ? 'กำลังลบ…' : 'ลบถาวร'}</button>
          </div>
        </div>
      {/if}
    </AppDialog>
  </section>
{/if}
