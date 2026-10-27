<script lang="ts">
  import { replace } from 'svelte-spa-router'
  import { useAuthStore } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { treatyClient, treatyHeaders } from '@/lib/treaty'
  import AppImage from '@/components/AppImage.svelte'
  import AppDialog from '@/components/AppDialog.svelte'

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
  let confirmEmpty = $state(false)
  let busyId = $state<string | null>(null)
  let focused = $state(0)

  function since(ts: number) {
    const days = Math.max(0, Math.floor((Date.now() - ts) / 86400000))
    if (days === 0) return 'วันนี้'
    return `${days} วันที่แล้ว`
  }

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

  async function emptyTrash() {
    if (busyId) return
    busyId = '__empty__'
    error = null
    try {
      for (const item of items) {
        const { error: requestError } = await treatyClient.api.clients.trash.post({ id: item.id }, { query: { action: 'force-delete' }, headers: await treatyHeaders() })
        if (requestError) throw new Error('fail')
      }
      items = []
    } catch {
      error = 'ล้างถังขยะไม่สำเร็จ'
      void fetchTrash()
    } finally {
      busyId = null
      confirmEmpty = false
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
  <div class="scroll-thin mx-auto h-full max-w-xl overflow-y-auto px-3 pb-28 pt-4 sm:px-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div>
        <h1 class="font-display text-lg font-semibold">ถังขยะ</h1>
        <p class="text-[11px] text-muted-foreground">
          ระเบียนที่ลบจะถูกเก็บไว้ 30 วันก่อนถูกลบถาวรอัตโนมัติ
        </p>
      </div>
      {#if items.length > 0}
        <button type="button" onclick={() => (confirmEmpty = true)} disabled={busyId !== null} class="inline-flex min-h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50">
          ล้างทั้งหมด
        </button>
      {/if}
    </div>

    {#if error}
      <p role="alert" class="mt-2 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
    {/if}

    {#if loading}
      <div class="mt-4 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดถังขยะ…</div>
    {:else if items.length === 0 && !error}
      <div class="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">ถังขยะว่างเปล่า</div>
    {:else}
      <div class="space-y-2">
        {#each items as item, index (item.id)}
          {@const active = index === focused}
          <div class="rounded-2xl border border-border bg-card flex items-center gap-3 p-2.5 {active ? 'ring-1 ring-primary' : ''}" onmouseenter={() => (focused = index)} role="listitem">
            {#if item.images[0]}
              <AppImage src={item.images[0]} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg object-cover border border-border" />
            {:else}
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground font-mono text-xs">
                {(item.shopName[0] || item.name[0] || '·').trim().charAt(0).toUpperCase()}
              </span>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{item.shopName[0] || item.name[0] || item.id}</p>
              <p class="truncate text-[11px] text-muted-foreground">
                {item.name[0] || ''} · <span class="font-mono">{item.id}</span>
              </p>
              <p class="text-[10px] text-muted-foreground/80">
                ลบเมื่อ {since(item.deletedAt)}
              </p>
            </div>
            <button type="button" disabled={busyId === item.id} onclick={() => void restore(item.id)} class="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
              กู้คืน
            </button>
            <button type="button" disabled={busyId === item.id} onclick={() => (confirm = item)} aria-label="ลบ {item.shopName[0] || item.name[0] || item.id} ถาวร" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50">
              ×
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <AppDialog open={confirm !== null} onClose={() => { if (!busyId) confirm = null }} title="ลบถาวร">
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

    <AppDialog open={confirmEmpty} onClose={() => { if (busyId === null) confirmEmpty = false }} title="ล้างถังขยะทั้งหมด?">
      <div class="p-6">
        <p class="mt-2 text-sm text-muted-foreground">การลบถาวรไม่สามารถย้อนกลับได้ ไฟล์รูปใน R2 ที่ผูกกับระเบียนเหล่านี้จะถูกลบไปด้วย</p>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" onclick={() => (confirmEmpty = false)} disabled={busyId !== null} class="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">ยกเลิก</button>
          <button type="button" disabled={busyId !== null} onclick={() => void emptyTrash()} class="min-h-11 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">{busyId === '__empty__' ? 'กำลังลบ…' : `ลบถาวร ${items.length} รายการ`}</button>
        </div>
      </div>
    </AppDialog>
  </div>
{/if}