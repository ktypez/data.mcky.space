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
      await deleteClient(client.id)
      useClientStore.getState().removeClient(client.id)
      confirm = false
      push('/')
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
  <div class="mx-auto w-full max-w-2xl px-3 pb-4 pt-6 sm:px-4">{@render children()}</div>
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
    <button type="button" onclick={() => push('/')} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted"><ArrowLeft class="inline h-3 w-3" aria-hidden /> กลับ</button>
    <div class="flex items-center gap-1">
      <button type="button" onclick={() => void copyLink()} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted" aria-label="คัดลอกลิงก์">
        {#if copiedLink}<Check weight="bold" class="inline h-3 w-3 text-success" aria-hidden /> คัดลอกแล้ว{:else}<LinkSimple class="inline h-3 w-3" aria-hidden /> ลิงก์{/if}
      </button>
      {#if isAdmin}
        <button type="button" disabled={!canMutate} onclick={() => push(`/edit/${encodeURIComponent(client!.id)}`)} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><PencilSimple class="inline h-3 w-3" aria-hidden /> แก้ไข</button>
        <button type="button" disabled={!canMutate} onclick={() => (confirm = true)} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"><Trash class="inline h-3 w-3" aria-hidden /> ลบ</button>
      {/if}
    </div>
  </div>

  {#if refreshing || dataState !== 'live'}
    <p class="mt-4 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">
      {refreshing ? 'กำลังตรวจสอบข้อมูลล่าสุด…' : (err ?? 'ข้อมูลนี้อาจไม่ใช่ข้อมูลล่าสุด')}
    </p>
  {/if}
  {#if err && dataState === 'live'}
    <p role="alert" class="mt-4 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</p>
  {/if}

  <div class="mt-8 min-w-0">
    <h1 class="sr-only">รายละเอียดรายการ</h1>
    <div>
      <ClientNames client={client!} variant="detail" titleClassName="text-lg font-semibold leading-tight break-words whitespace-normal [overflow-wrap:anywhere]" branchClassName="mt-1 text-sm opacity-60 break-words whitespace-normal [overflow-wrap:anywhere]" subClassName="mt-1 text-sm opacity-60 break-words whitespace-normal [overflow-wrap:anywhere]" />
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      {#if badgeLabel}
        <span class="inline-flex rounded-full bg-secondary px-2.5 py-1 font-mono text-xs font-medium text-secondary-foreground ring-1 ring-border">{badgeLabel}</span>
      {/if}
      <button type="button" onclick={() => void copyAll()} class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted"><Copy class="h-3 w-3" aria-hidden /> {copiedAll ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูล'}</button>
    </div>
  </div>

  <div class="mt-6 overflow-hidden rounded-xl border border-border bg-card">
    <table class="w-full border-collapse font-mono text-xs">
      <tbody>
        {#each rows as [key, value]}
          <tr class="border-b border-border last:border-0">
            <th scope="row" class="w-28 bg-muted/50 px-3 py-2 text-left font-semibold uppercase opacity-60">{key}</th>
            <td class="px-3 py-2 leading-5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if client!.notes}
    <div class="mt-4 rounded-xl border border-border bg-card p-5">
      <p class="font-mono text-xs uppercase tracking-wide opacity-40">โน้ต</p>
      <blockquote class="mt-2 whitespace-pre-wrap break-words border-l-2 border-foreground/20 pl-4 text-[15px] leading-7 [overflow-wrap:anywhere]">“{client!.notes}”</blockquote>
    </div>
  {/if}

  {#if coords}
    <div class="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <div class="h-56 overflow-hidden"><MapPreviewDynamic lat={coords.lat} lng={coords.lng} /></div>
      <div class="flex items-center justify-between gap-3 px-4 py-2">
        <span class="font-mono text-xs opacity-50">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
        <a href={getMapsUrl(coords.lat, coords.lng)} target="_blank" rel="noreferrer" class="min-h-11 py-3 font-mono text-xs underline opacity-70">เปิด Google Maps →</a>
      </div>
    </div>
  {/if}

  {#if client!.images.length > 0}
    <div class="mt-4 overflow-hidden rounded-xl border border-border bg-card">
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

  <p class="mt-4 break-all font-mono text-[10px] uppercase opacity-30">record {client!.id} · created {formatDateTime(client!.createdAt)}</p>

  <AppDialog open={lightboxIdx !== null} onClose={() => (lightboxIdx = null)} title="รูปภาพ" showHeader={false} variant="lightbox">
    {#if lightboxIdx !== null && client!.images[lightboxIdx]}
      <div class="relative w-fit">
        <img src={client!.images[lightboxIdx]} alt={`รูปที่ ${lightboxIdx + 1}`} class="block max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] object-contain" />
        <button type="button" onclick={() => (lightboxIdx = null)} class="absolute right-3 top-3 min-h-11 rounded-full bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">ปิด</button>
      </div>
    {/if}
  </AppDialog>

  <AppDialog open={confirm} onClose={() => { if (!deleting) confirm = false }} title="ลบรายการ">
    <div class="p-6">
      <p class="mt-2 text-sm text-muted-foreground">“{displayName}” จะเข้าถังขยะ</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" onclick={() => (confirm = false)} disabled={deleting} class="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">ยกเลิก</button>
        <button type="button" disabled={deleting} onclick={() => void doDelete()} class="min-h-11 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">{deleting ? 'กำลังลบ…' : 'ลบ'}</button>
      </div>
    </div>
  </AppDialog>
{/snippet}
