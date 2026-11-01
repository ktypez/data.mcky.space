<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { ArrowLeft, PencilSimple, Copy, Check, LinkSimple, Trash } from 'phosphor-svelte'
  import { useClientStore } from '@/stores/client-store'
  import { useAuthStore } from '@/stores/auth-store'
  import { deleteClient, fetchClientByIdResult, peekClientById } from '@/lib/storage'
  import type { Client } from '@/types/index'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import AppDialog from '@/components/AppDialog.svelte'
  import MapPreviewDynamic from '@/components/MapPreviewDynamic.svelte'
  import { showToast } from '@/lib/toast'
  import { treatyClient, treatyHeaders } from '@/lib/treaty'
  import { copyToClipboard, formatDate, formatDateTime, getMapsUrl, hasValidCoords, COPIED_FLASH_MS } from '@/lib/utils'
  import { clientTextWithMaps } from '@/lib/clientText'
  import { clientTitle } from '@/lib/clientNames'

  let { params }: { params: { id: string } } = $props()
  let id = $derived(params?.id ?? '')
  let isAdmin = $derived($useAuthStore.isAdmin)

  let client = $state<Client | null>(null)
  let loadedId = $state<string | null>(null)
  let loading = $state(true)
  let refreshing = $state(false)
  let dataState = $state<'live' | 'cached' | 'preview' | 'offline' | 'error'>('live')
  let err = $state<string | null>(null)
  let lightboxIdx = $state<number | null>(null)
  let confirm = $state(false)
  let deleting = $state(false)
  let copiedLink = $state(false)
  let copiedAll = $state(false)

  $effect(() => {
    const currentId = id
    let cancelled = false
    loadedId = null
    client = null
    loading = true
    refreshing = false
    dataState = 'live'
    err = null
    lightboxIdx = null
    confirm = false
    copiedLink = false
    copiedAll = false

    const load = async () => {
      const storeClient = useClientStore.getState().clients.find((c) => c.id === currentId)
      if (storeClient) {
        client = storeClient
        dataState = 'preview'
        loading = false
        loadedId = currentId
        refreshing = true
      }

      let stale: Client | null = null
      try {
        stale = await peekClientById(currentId)
        if (cancelled) return
        if (stale) {
          client = stale
          dataState = 'cached'
          loading = false
          loadedId = currentId
          refreshing = true
          useClientStore.getState().upsertClient(stale)
        }
      } catch {
        // A cache miss must not prevent the authoritative request below.
      }

      try {
        const result = await fetchClientByIdResult(currentId)
        if (cancelled) return
        if (result.status === 'found') {
          client = result.client
          dataState = 'live'
          err = null
          useClientStore.getState().upsertClient(result.client)
        } else if (result.status === 'offline') {
          const offlineClient = result.client
          if (offlineClient) {
            client = offlineClient
            dataState = 'offline'
            err = 'แสดงข้อมูลจากแคช — ยังตรวจสอบกับเซิร์ฟเวอร์ไม่ได้'
            useClientStore.getState().upsertClient(offlineClient)
          } else {
            const fallback = stale ?? storeClient
            client = fallback ?? null
            dataState = 'offline'
            err = 'ออฟไลน์ — ข้อมูลบางส่วนอาจยังไม่ครบ'
          }
        } else if (result.status === 'not-found') {
          client = null
          dataState = 'error'
          err = 'ไม่พบข้อมูล'
        } else {
          const fallback = stale ?? storeClient
          client = fallback ?? null
          dataState = 'error'
          err = 'โหลดข้อมูลไม่สำเร็จ — กำลังแสดงข้อมูลที่มีอยู่'
        }
      } catch {
        if (!cancelled) {
          const fallback = stale ?? storeClient
          client = fallback ?? null
          dataState = 'error'
          err = 'โหลดข้อมูลไม่สำเร็จ — กำลังแสดงข้อมูลที่มีอยู่'
        }
      } finally {
        if (!cancelled) {
          loading = false
          refreshing = false
          loadedId = currentId
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  })

  async function copyLink() {
    const ok = await copyToClipboard(window.location.href)
    if (!ok) return
    copiedLink = true
    showToast('คัดลอกลิงก์แล้ว')
    setTimeout(() => (copiedLink = false), COPIED_FLASH_MS)
  }

  async function copyAll() {
    if (!client) return
    const ok = await copyToClipboard(clientTextWithMaps(client, getMapsUrl))
    if (!ok) return
    copiedAll = true
    setTimeout(() => (copiedAll = false), COPIED_FLASH_MS)
  }

  let coords = $derived(client && hasValidCoords(client.lat, client.lng) ? { lat: client.lat as number, lng: client.lng as number } : null)
  let canMutate = $derived(isAdmin && dataState === 'live' && !refreshing && !loading)

  async function doDelete() {
    if (!canMutate || !client) return
    deleting = true
    err = null
    try {
      const deletedId = client.id
      const label = clientTitle(client) || deletedId.slice(0, 8)
      await deleteClient(deletedId)
      useClientStore.getState().removeClient(deletedId)
      confirm = false
      push('/')
      showToast(`ย้าย “${label}” ไปถังขยะ`, {
        actionLabel: 'เลิกทำ',
        onAction: () => {
          void (async () => {
            try {
              const { error } = await treatyClient.api.clients.trash.post({ id: deletedId }, { query: { action: 'restore' }, headers: await treatyHeaders() })
              if (error) throw new Error('restore')
              await useClientStore.getState().refresh().catch(() => undefined)
              showToast('กู้คืนแล้ว')
            } catch {
              showToast('กู้คืนไม่สำเร็จ — ลองจากถังขยะ')
            }
          })()
        },
      })
    } catch {
      err = 'ลบไม่สำเร็จ'
    } finally {
      deleting = false
    }
  }

  let displayName = $derived(client ? clientTitle(client) || client.id.slice(0, 8) : '')
  let badgeLabel = $derived(client?.badge === 'penpay' ? 'จ่ายในวัน' : client?.badge === 'credit' ? 'บัตรเครดิต' : null)
</script>

{#snippet shell(children: import('svelte').Snippet)}
  <div class="mx-auto w-full max-w-5xl px-3 pb-6 pt-6 sm:px-8">{@render children()}</div>
{/snippet}

{#if loadedId !== id || (loading && !client)}
  {@render shell(shellInner)}
{:else if !client}
  {@render shell(noData)}
{:else}
  {@render shell(record)}
{/if}

{#snippet shellInner()}
  <p class="font-mono text-sm text-muted-foreground" role="status">กำลังโหลด…</p>
{/snippet}

{#snippet noData()}
  <div class="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
    <p class="font-mono text-xs text-destructive">{err ?? 'ไม่พบข้อมูล'}</p>
    <button type="button" onclick={() => push('/')} class="mt-6 min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-card">กลับ</button>
  </div>
{/snippet}

{#snippet record()}
  {@const rows: [string, string][] = [
    ['ที่อยู่', client!.address || '—'],
    ['สร้างเมื่อ', formatDate(client!.createdAt)],
    ['อัปเดต', formatDate(client!.updatedAt)],
  ]}
  <div class="flex items-start justify-between gap-2">
    <button type="button" onclick={() => push('/')} class="inline-flex min-h-11 items-center gap-1 rounded-[10px] border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"><ArrowLeft class="inline h-3 w-3" aria-hidden /> กลับ</button>
    <div class="flex items-center gap-1">
      <button type="button" onclick={() => void copyLink()} class="inline-flex min-h-11 items-center gap-1 rounded-[10px] border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted" aria-label="คัดลอกลิงก์">
        {#if copiedLink}<Check weight="bold" class="inline h-3 w-3 text-success" aria-hidden /> คัดลอกแล้ว{:else}<LinkSimple class="inline h-3 w-3" aria-hidden /> ลิงก์{/if}
      </button>
      {#if isAdmin}
        <button type="button" disabled={!canMutate} onclick={() => push(`/edit/${encodeURIComponent(client!.id)}`)} class="inline-flex min-h-11 items-center gap-1 rounded-[10px] border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><PencilSimple class="inline h-3 w-3" aria-hidden /> แก้ไข</button>
        <button type="button" disabled={!canMutate} onclick={() => (confirm = true)} class="inline-flex min-h-11 items-center gap-1 rounded-[10px] border border-destructive px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"><Trash class="inline h-3 w-3" aria-hidden /> ลบ</button>
      {/if}
    </div>
  </div>

  {#if refreshing || dataState !== 'live'}
    <p class="mt-4 rounded-[10px] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">
      {refreshing ? 'กำลังตรวจสอบข้อมูลล่าสุด…' : (err ?? 'ข้อมูลนี้อาจไม่ใช่ข้อมูลล่าสุด')}
    </p>
  {/if}
  {#if err && dataState === 'live'}
    <p role="alert" class="mt-4 rounded-[10px] border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</p>
  {/if}

  <div class="mt-6 flex min-w-0 items-start gap-4">
    <span aria-hidden="true" class="flex size-[72px] shrink-0 items-center justify-center rounded-[18px] bg-muted text-3xl font-bold text-primary">{(displayName || '?').trim().charAt(0).toUpperCase()}</span>
    <div class="min-w-0 flex-1">
      <h1 class="sr-only">รายละเอียดรายการ</h1>
      <ClientNames client={client!} variant="detail" titleClassName="text-[clamp(22px,6vw,30px)] font-bold leading-tight tracking-tight break-words whitespace-normal [overflow-wrap:anywhere]" branchClassName="mt-1 text-sm text-muted-foreground break-words whitespace-normal [overflow-wrap:anywhere]" subClassName="mt-1 text-sm text-muted-foreground break-words whitespace-normal [overflow-wrap:anywhere]" />
      <div class="mt-3 flex flex-wrap items-center gap-2">
        {#if badgeLabel}
          <span class="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-primary">{badgeLabel}</span>
        {/if}
        <span class="font-mono text-xs text-muted-foreground">#{client!.id.slice(0, 8)} · อัปเดต {formatDate(client!.updatedAt)}</span>
        <button type="button" onclick={() => void copyAll()} class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"><Copy class="h-3.5 w-3.5" aria-hidden /> {copiedAll ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูล'}</button>
      </div>
    </div>
  </div>

  <div class="mt-6 grid items-start gap-5 lg:grid-cols-2">
  <div class="min-w-0 space-y-5">
  <div class="overflow-hidden rounded-2xl border border-border bg-card">
    <p class="ledger-eyebrow border-b border-border px-4 py-3">รายละเอียด</p>
    <table class="w-full border-collapse text-sm">
      <tbody>
        {#each rows as [key, value]}
          <tr class="border-b border-border last:border-0">
            <th scope="row" class="ledger-colhead w-28 px-4 py-3 text-left align-top font-medium">{key}</th>
            <td class="px-4 py-3 leading-6 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if client!.notes}
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="ledger-eyebrow">โน้ต</p>
      <blockquote class="mt-3 max-w-[62ch] whitespace-pre-wrap break-words border-l-[3px] border-primary pl-4 text-[15px] leading-7 [overflow-wrap:anywhere]">“{client!.notes}”</blockquote>
    </div>
  {/if}

  </div>
  <div class="min-w-0 space-y-5">
  {#if coords}
    <div class="overflow-hidden rounded-2xl border border-border bg-card">
      <div class="h-56 overflow-hidden"><MapPreviewDynamic lat={coords.lat} lng={coords.lng} /></div>
      <div class="flex items-center justify-between gap-3 px-4 py-2">
        <span class="font-mono text-xs opacity-50">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
        <a href={getMapsUrl(coords.lat, coords.lng)} target="_blank" rel="noreferrer" class="min-h-11 py-3 text-sm font-medium text-primary underline">เปิด Google Maps →</a>
      </div>
    </div>
  {/if}

  {#if client!.images.length > 0}
    <div class="overflow-hidden rounded-2xl border border-border bg-card">
      {#if client!.images.length === 1}
        <button type="button" onclick={() => (lightboxIdx = 0)} class="group aspect-square block w-full overflow-hidden">
          <AppImage src={client!.images[0]} alt="รูปที่ 1" className="h-full w-full object-cover transition-transform group-hover:scale-[1.01]" />
        </button>
      {:else}
        <div class="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {#each client!.images as src, index}
            <button type="button" onclick={() => (lightboxIdx = index)} class="group aspect-square overflow-hidden bg-card">
              <AppImage {src} alt={`รูปที่ ${index + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  </div>
  </div>

  <p class="mt-6 break-all font-mono text-[10px] uppercase text-muted-foreground">record {client!.id} · created {formatDateTime(client!.createdAt)}</p>

  <AppDialog open={lightboxIdx !== null} onClose={() => (lightboxIdx = null)} title="รูปภาพ" showHeader={false} variant="lightbox">
    {#if lightboxIdx !== null && client!.images[lightboxIdx]}
      <div class="relative w-fit">
        <img src={client!.images[lightboxIdx]} alt={`รูปที่ ${lightboxIdx + 1}`} class="block max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] object-contain" />
        {#if client!.images.length > 1}
          <span class="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1.5 font-mono text-xs text-white" aria-live="polite">{lightboxIdx + 1} / {client!.images.length}</span>
          <button type="button" aria-label="รูปก่อนหน้า" onclick={() => (lightboxIdx = (lightboxIdx! - 1 + client!.images.length) % client!.images.length)} class="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-xl text-white">‹</button>
          <button type="button" aria-label="รูปถัดไป" onclick={() => (lightboxIdx = (lightboxIdx! + 1) % client!.images.length)} class="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-xl text-white">›</button>
        {/if}
        <button type="button" onclick={() => (lightboxIdx = null)} class="absolute right-3 top-3 min-h-11 rounded-full bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">ปิด</button>
      </div>
    {/if}
  </AppDialog>

  <AppDialog open={confirm} onClose={() => { if (!deleting) confirm = false }} title="ลบรายการ">
    <div class="p-6">
      <p class="mt-2 text-sm text-muted-foreground">“{displayName}” จะเข้าถังขยะ</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" onclick={() => (confirm = false)} disabled={deleting} class="min-h-11 rounded-[10px] border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">ยกเลิก</button>
        <button type="button" disabled={deleting} onclick={() => void doDelete()} class="min-h-11 rounded-[10px] bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">{deleting ? 'กำลังลบ…' : 'ลบ'}</button>
      </div>
    </div>
  </AppDialog>
{/snippet}
