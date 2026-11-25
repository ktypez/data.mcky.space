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
  <section class="page-shell page-shell--trash trash-page">
    <header class="trash-head"><div><span class="eyebrow">DATA LEDGER · ARCHIVE</span><h1>ถังขยะ</h1><p>รายการที่ลบและยังสามารถกู้คืนได้</p></div><strong class="trash-count">{items.length} <small>รายการ</small></strong></header>

    <div class="sticker mt-7 flex items-start gap-3 rounded-2xl !border-pri bg-tint p-4 shadow-sm">
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

    <div role="list" aria-label="รายการถังขยะ" class="trash-list mt-4">
      <div class="trash-list-head"><span>รายการ</span><span>วันหมดอายุ</span><span>การทำงาน</span></div>
      {#if loading}
        <div class="p-8 text-center text-sm text-ink-soft" role="status">กำลังโหลดถังขยะ…</div>
      {:else if items.length === 0 && !error}
        <div class="empty-trash">
          <span class="sticker grid size-16 place-items-center rounded-2xl bg-tint text-acc-ink shadow-sm" aria-hidden="true">
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

<style>
  .trash-page { max-width:var(--maxw);padding-top:24px;padding-bottom:56px; }
  .trash-head { display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:2px solid var(--rule-2); }
  .eyebrow { color:var(--pri);font:700 11px var(--font-mono);letter-spacing:.12em; }.trash-head h1 { margin-top:4px; }.trash-head p { margin-top:4px;color:var(--ink-faint);font-size:var(--fs-sm); }
  .trash-count { color:var(--pri);font:700 var(--fs-xl) var(--font-display);white-space:nowrap; }.trash-count small { color:var(--ink-faint);font:var(--fs-sm) var(--font-ui); }
  .trash-list { overflow:hidden;border:1px solid var(--rule);border-radius:var(--r-md);background:var(--paper-2); }
  .trash-list-head { display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;padding:9px 16px;border-bottom:1px solid var(--rule);background:var(--paper-3);color:var(--ink-faint);font-size:var(--fs-2xs);font-weight:700;letter-spacing:.06em;text-transform:uppercase; }
  .trash-list .row { min-height:62px;border-bottom:1px solid var(--rule); }.trash-list .row:last-child { border-bottom:0; }
  .empty-trash { display:flex;flex-direction:column;align-items:center;gap:10px;padding:42px 20px;text-align:center; }.empty-trash > span { width:54px;height:54px;border-radius:var(--r-md); }
  @media(max-width:620px) { .trash-list-head { grid-template-columns:minmax(0,1fr) auto; }.trash-list-head span:nth-child(2) { display:none; } }
</style>
