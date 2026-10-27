<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { ArrowLeft, PencilSimple, Copy, Trash } from 'phosphor-svelte'
  import { useClientStore } from '@/stores/client-store'
  import { useAuthStore } from '@/stores/auth-store'
  import { deleteClient, fetchClientByIdResult, peekClientById } from '@/lib/storage'
  import type { Client } from '@/types/index'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import AppDialog from '@/components/AppDialog.svelte'
  import MapPreviewDynamic from '@/components/MapPreviewDynamic.svelte'
  import { copyToClipboard, formatDate, getMapsUrl, hasValidCoords, COPIED_FLASH_MS } from '@/lib/utils'
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
  let copiedAll = $state(false)
  let showMap = $state(false)

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
    copiedAll = false
    showMap = false

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

  function copyValue(value: string) {
    void copyToClipboard(value)
  }
</script>

{#if loadedId !== id || (loading && !client)}
  <div class="mx-auto w-full max-w-xl px-3 pb-4 pt-6 sm:px-4">
    <p class="font-mono text-sm text-muted-foreground" role="status">กำลังโหลด…</p>
  </div>
{:else if !client}
  <div class="mx-auto w-full max-w-xl px-3 pb-4 pt-6 sm:px-4">
    <div class="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
      <p class="font-mono text-xs text-destructive">{err ?? 'ไม่พบข้อมูล'}</p>
      <button type="button" onclick={() => push('/')} class="mt-6 min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-card">กลับ</button>
    </div>
  </div>
{:else}
  <div class="scroll-thin mx-auto h-full max-w-xl overflow-y-auto px-3 pb-28 pt-4 sm:px-4">
    <div class="mb-3 flex items-center gap-2">
      <button type="button" onclick={() => push('/')} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted">
        <ArrowLeft class="inline h-3 w-3" aria-hidden /> กลับ
      </button>
      <span class="ml-auto font-mono text-[11px] text-muted-foreground">{client!.id}</span>
      <button type="button" onclick={() => copyValue(client!.id)} class="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground hover:bg-muted" aria-label="คัดลอกรหัส">
        <Copy class="h-3 w-3" aria-hidden />
      </button>
    </div>

    {#if refreshing || dataState !== 'live'}
      <p class="mt-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">
        {refreshing ? 'กำลังตรวจสอบข้อมูลล่าสุด…' : (err ?? 'ข้อมูลนี้อาจไม่ใช่ข้อมูลล่าสุด')}
      </p>
    {/if}
    {#if err && dataState === 'live'}
      <p role="alert" class="mt-2 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</p>
    {/if}

    <div class="rounded-2xl border border-border bg-card overflow-hidden">
      <div class="flex gap-3 p-3">
        {#if client.images[0]}
          <button type="button" onclick={() => (lightboxIdx = 0)} class="size-20 shrink-0 overflow-hidden rounded-xl border border-border">
            <AppImage src={client.images[0]} alt={client.shopName.join(', ')} className="h-full w-full object-cover" />
          </button>
        {:else}
          <div class="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
            <span class="font-mono text-xs">ไม่มีรูป</span>
          </div>
        {/if}
        <div class="min-w-0 flex-1">
          <ClientNames client={client} variant="detail" titleClassName="truncate font-display text-lg font-semibold leading-tight" branchClassName="truncate text-xs text-muted-foreground" subClassName="mt-1 truncate text-sm" />
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
            {#if badgeLabel}
              <span class="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">{badgeLabel}</span>
            {/if}
            {#if client.notes?.trim()}
              <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">มีโน้ต</span>
            {/if}
            {#if coords}
              <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">มีพิกัด</span>
            {/if}
          </div>
        </div>
      </div>

      {#if client.images.length > 1}
        <div class="flex gap-2 overflow-x-auto px-3 pb-3">
          {#each client.images.slice(1) as src, i}
            <button type="button" onclick={() => (lightboxIdx = i + 1)} class="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-border">
              <AppImage {src} alt={`${client.shopName.join(', ')} รูปที่ ${i + 2}`} className="h-full w-full object-cover" />
            </button>
          {/each}
        </div>
      {/if}

      <div class="border-t border-border">
        {#each [
          ['ชื่อลูกค้า', client.name.join(', ') || '—', true],
          ['ชื่อร้าน', client.shopName.join(', ') || '—', true],
          ['สาขา', client.branch || '—', true],
          ['ที่อยู่', client.address || '—', true],
          ['พิกัด', coords ? `${coords.lat}, ${coords.lng}` : '—', true],
          ['โน้ต', client.notes || '—', false],
          ['สร้างเมื่อ', formatDate(client.createdAt), false],
          ['แก้ไขล่าสุด', formatDate(client.updatedAt), false],
        ] as [label, value, copy]}
          <div class="flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
            <span class="w-20 shrink-0 pt-0.5 text-[11px] text-muted-foreground">{label}</span>
            <span class="min-w-0 flex-1 whitespace-pre-wrap text-sm {copy && value !== '—' ? 'font-mono' : ''}">{value}</span>
            {#if copy && value !== '—'}
              <button type="button" onclick={() => copyValue(String(value))} class="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="คัดลอก{label}">
                <Copy class="h-3.5 w-3.5" aria-hidden />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    {#if coords}
      <div class="mt-3 rounded-2xl border border-border bg-card overflow-hidden">
        <div class="flex items-center justify-between gap-2 px-3 py-2">
          <span class="text-xs font-medium text-muted-foreground">ตำแหน่งบนแผนที่</span>
          <div class="flex items-center gap-2">
            <a href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`} target="_blank" rel="noreferrer" class="text-[11px] text-primary underline-offset-2 hover:underline">
              เปิดแผนที่ภายนอก
            </a>
            <button type="button" onclick={() => (showMap = !showMap)} class="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted">
              {showMap ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>
        </div>
        {#if showMap}
          <div class="h-56 border-t border-border">
            <MapPreviewDynamic lat={coords.lat} lng={coords.lng} />
          </div>
        {/if}
      </div>
    {/if}

    <div class="mt-3 flex gap-2">
      <button type="button" onclick={() => void copyAll()} class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted">
        <Copy class="h-3 w-3" aria-hidden /> {copiedAll ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูล'}
      </button>
      {#if isAdmin}
        <button type="button" disabled={!canMutate} onclick={() => push(`/edit/${encodeURIComponent(client!.id)}`)} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
          <PencilSimple class="inline h-3 w-3" aria-hidden /> แก้ไข
        </button>
        <button type="button" disabled={!canMutate} onclick={() => (confirm = true)} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash class="inline h-3 w-3" aria-hidden /> ลบ
        </button>
      {/if}
    </div>

    {#if !isAdmin}
      <p class="mt-2 text-center text-[11px] text-muted-foreground">
        การแก้ไขและลบต้องเข้าสู่ระบบผู้ดูแลก่อน —
        <a href="#/login" class="text-primary underline-offset-2 hover:underline">เข้าสู่ระบบ</a>
      </p>
    {/if}

    <AppDialog open={lightboxIdx !== null} onClose={() => (lightboxIdx = null)} title="รูปภาพ" showHeader={false} variant="lightbox">
      {#if lightboxIdx !== null && client.images[lightboxIdx]}
        <div class="relative w-fit">
          <img src={client.images[lightboxIdx]} alt={`รูปที่ ${lightboxIdx + 1}`} class="block max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] object-contain" />
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
  </div>
{/if}