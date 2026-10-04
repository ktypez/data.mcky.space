<script lang="ts">
  import { replace } from 'svelte-spa-router'
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
  <section class="mx-auto max-w-xl px-3 pb-8 pt-6 sm:px-4">
    <h1 class="sr-only">ถังขยะ</h1>
    <div class="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
      <span>{loading ? 'กำลังโหลด…' : `${items.length} รายการ`}</span>
      <span class="font-mono opacity-60">↑↓ เลือก · Enter กู้คืน</span>
    </div>
    {#if error}
      <p role="alert" class="mt-4 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
    {/if}

    <div role="list" aria-label="รายการถังขยะ" class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {#if loading}
        <div class="p-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดถังขยะ…</div>
      {:else if items.length === 0 && !error}
        <div class="p-8 text-center text-sm opacity-50">ถังขยะว่าง</div>
      {:else}
        {#each items as item, index (item.id)}
          {@const active = index === focused}
          <div role="listitem" onmouseenter={() => (focused = index)} class="flex items-center {active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'} border-b border-border last:border-b-0">
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
                <AppImage src={item.images[0]} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover border border-border" />
              {:else}
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono {active ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground'}">{(item.shopName[0] || item.name[0] || '·').trim().charAt(0).toUpperCase()}</span>
              {/if}
              <span class="min-w-0 flex-1">
                <ClientNames client={item} variant="list" titleClassName="text-sm truncate {active ? 'text-primary-foreground' : 'text-foreground'}" subClassName="text-xs truncate {active ? 'text-primary-foreground/60' : 'opacity-60'}" />
                <span class="font-mono text-[10px] {active ? 'text-primary-foreground/50' : 'opacity-30'}">ลบเมื่อ {formatDateTime(item.deletedAt)}</span>
              </span>
            </button>
            <div class="flex shrink-0 items-center gap-1 pr-3">
              <button type="button" disabled={busyId === item.id} onclick={() => void restore(item.id)} class="min-h-11 rounded-full px-3 text-xs disabled:opacity-50 {active ? 'bg-background text-foreground' : 'border border-border bg-card hover:bg-muted'}">กู้คืน</button>
              <button type="button" disabled={busyId === item.id} onclick={() => (confirm = item)} aria-label={`ลบ ${item.shopName[0] || item.name[0] || item.id} ถาวร`} class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold leading-none transition-colors disabled:opacity-50 {active ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground'}">×</button>
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
            <button type="button" onclick={() => (confirm = null)} disabled={busyId !== null} class="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">ยกเลิก</button>
            <button type="button" disabled={busyId !== null} onclick={() => void forceDelete(confirm!.id)} class="min-h-11 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">{busyId === confirm.id ? 'กำลังลบ…' : 'ลบถาวร'}</button>
          </div>
        </div>
      {/if}
    </AppDialog>
  </section>
{/if}
