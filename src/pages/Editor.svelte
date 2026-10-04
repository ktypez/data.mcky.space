<script lang="ts">
  import { push, replace } from 'svelte-spa-router'
  import { untrack } from 'svelte'
  import { ArrowLeft, Plus, Pencil } from 'phosphor-svelte'
  import { useClientStore } from '@/stores/client-store'
  import { useAuthStore } from '@/stores/auth-store'
  import { addClient, fetchClientByIdResult, updateClient } from '@/lib/storage'
  import { generateId } from '@/lib/utils'
  import { setFormDirty } from '@/lib/form-dirty'
  import { checkDuplicateName, type DuplicateResult } from '@/lib/duplicate-names'
  import type { Client } from '@/types/index'
  import MultiValueInput from '@/components/MultiValueInput.svelte'
  import FormNameField from '@/components/FormNameField.svelte'
  import FormNotesField from '@/components/FormNotesField.svelte'
  import FormBadgeField from '@/components/FormBadgeField.svelte'
  import LocationSection from '@/components/LocationSection.svelte'
  import PhotoSection from '@/components/PhotoSection.svelte'
  import Input from '@/components/ui/Input.svelte'
  import Label from '@/components/ui/Label.svelte'
  import Button from '@/components/ui/Button.svelte'

  let { params }: { params?: { id?: string } } = $props()
  let id = $derived(params?.id ?? '')

  let clients = $derived($useClientStore.clients)
  let isAdmin = $derived($useAuthStore.isAdmin)
  let checking = $derived($useAuthStore.checking)

  let editClient = $state<Client | null>(null)
  let loadedId = $state<string | null>(untrack(() => id || null))
  let hydrating = $state(untrack(() => Boolean(id)))
  let loadError = $state<string | null>(null)
  let reloadKey = $state(0)
  let name = $state<string[]>([''])
  let shopName = $state<string[]>([''])
  let branch = $state('')
  let address = $state('')
  let lat = $state<number | null>(null)
  let lng = $state<number | null>(null)
  let images = $state<string[]>([])
  let thumbs = $state<Record<string, string | null>>({})
  let badge = $state<string | null>(null)
  let notes = $state('')
  let debouncedName = $state('')
  let uploading = $state(false)
  let progress = $state(0)
  let error = $state<string | null>(null)
  let tab = $state(0)
  let initialSnapshot = snapshot({ name: [''], shopName: [''], branch: '', address: '', lat: null, lng: null, images: [], badge: null, notes: '' })
  let submitLock = false

  type FormSnapshot = { name: string[]; shopName: string[]; branch: string; address: string; lat: number | null; lng: number | null; images: string[]; badge: string | null; notes: string }
  function snapshot(values: FormSnapshot): string {
    return JSON.stringify(values)
  }

  function toArray(v: string | string[] | undefined): string[] {
    if (Array.isArray(v)) return v.length > 0 ? [...v] : ['']
    return [v ?? '']
  }

  function applyForm(client: Client | null) {
    const nextName = toArray(client?.name)
    const nextShopName = toArray(client?.shopName)
    const nextBranch = client?.branch ?? ''
    const nextAddress = client?.address ?? ''
    const nextLat = client?.lat ?? null
    const nextLng = client?.lng ?? null
    const nextImages = client?.images ?? []
    const nextBadge = client?.badge ?? null
    const nextNotes = client?.notes ?? ''
    editClient = client
    name = nextName
    shopName = nextShopName
    branch = nextBranch
    address = nextAddress
    lat = nextLat
    lng = nextLng
    images = nextImages
    badge = nextBadge
    notes = nextNotes
    thumbs = {}
    debouncedName = nextName.join('\u0000')
    tab = 0
    initialSnapshot = snapshot({ name: nextName, shopName: nextShopName, branch: nextBranch, address: nextAddress, lat: nextLat, lng: nextLng, images: nextImages, badge: nextBadge, notes: nextNotes })
  }

  $effect(() => {
    const currentId = id
        let cancelled = false
    const load = async () => {
      if (!currentId) {
        applyForm(null)
        loadedId = null
        hydrating = false
        loadError = null
        return
      }
      if (!isAdmin) {
        hydrating = false
        return
      }
      loadedId = null
      hydrating = true
      loadError = null
      try {
        const result = await fetchClientByIdResult(currentId)
        if (cancelled) return
        if (result.status === 'found') {
          applyForm(result.client)
          useClientStore.getState().upsertClient(result.client)
          loadError = null
        } else if (result.status === 'offline' && result.client) {
          applyForm(result.client)
          useClientStore.getState().upsertClient(result.client)
          loadError = 'ออฟไลน์ — แก้ไขไม่ได้จนกว่าจะเชื่อมต่ออินเทอร์เน็ต'
        } else {
          applyForm(null)
          loadError = result.status === 'not-found' ? 'ไม่พบรายการที่ต้องการแก้ไข' : 'โหลดข้อมูลไม่สำเร็จ — ลองใหม่หรือกลับไปหน้าหลัก'
        }
      } catch {
        if (!cancelled) {
          applyForm(null)
          loadError = 'โหลดข้อมูลไม่สำเร็จ — ลองใหม่หรือกลับไปหน้าหลัก'
        }
      } finally {
        if (!cancelled) {
          loadedId = currentId
          hydrating = false
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  })

  $effect(() => {
    const current = name
    const timer = setTimeout(() => (debouncedName = current.join('\u0000')), 250)
    return () => clearTimeout(timer)
  })

  let currentSnapshot = $derived(snapshot({ name, shopName, branch, address, lat, lng, images, badge, notes }))
  let dirty = $derived(currentSnapshot !== initialSnapshot)
  let readOnly = $derived(Boolean(loadError) || hydrating || checking)

  $effect(() => {
    setFormDirty(dirty && !readOnly)
    return () => setFormDirty(false)
  })

  $effect(() => {
    if (!dirty || readOnly) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  })

  let dupResult: DuplicateResult = $derived.by(() => {
    const targets = debouncedName.split('\u0000').map((n) => n.trim()).filter(Boolean)
    if (targets.length === 0) return { exact: null, similar: [] }
    const similarMap = new Map<string, { client: Client; similarity: number }>()
    let exact: Client | null = null
    for (const target of targets) {
      const result = checkDuplicateName(clients, target, editClient?.id)
      if (result.exact) {
        exact = result.exact
        break
      }
      for (const match of result.similar) {
        const previous = similarMap.get(match.client.id)
        if (!previous || match.similarity > previous.similarity) similarMap.set(match.client.id, match)
      }
    }
    return { exact, similar: [...similarMap.values()].sort((a, b) => b.similarity - a.similarity) }
  })

  const steps = ['ข้อมูลหลัก', 'ที่อยู่ & พิกัด', 'รูปภาพ']
  let canSave = $derived(name.some((value) => value.trim()) || shopName.some((value) => value.trim()))
  let editing = $derived(Boolean(editClient))

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (submitLock || readOnly || !canSave) return
    submitLock = true
    const cleanName = name.map((value) => value.trim()).filter(Boolean)
    const cleanShopName = shopName.map((value) => value.trim()).filter(Boolean)
    const data: Omit<Client, 'createdAt' | 'updatedAt'> = {
      id: editClient?.id ?? generateId(),
      name: cleanName,
      shopName: cleanShopName,
      branch: branch.trim(),
      address: address.trim(),
      lat,
      lng,
      images,
      badge,
      notes: notes.trim() || null,
    }
    const store = useClientStore.getState()
    const existing = editClient ?? store.clients.find((client) => client.id === data.id)
    try {
      uploading = true
      progress = 0
      error = null
      let saved: Client
      if (existing) {
        const updated: Client = { ...data, createdAt: existing.createdAt, updatedAt: Date.now() }
        saved = await updateClient(updated, (p) => (progress = p), thumbs)
      } else {
        const created: Client = { ...data, createdAt: Date.now(), updatedAt: Date.now() }
        saved = await addClient(created, (p) => (progress = p), thumbs)
      }
      store.upsertClient(saved)
      push(`/c/${encodeURIComponent(saved.id)}`)
    } catch (submitError) {
      error = submitError instanceof Error ? submitError.message : 'บันทึกไม่สำเร็จ'
      void store.refresh().catch(() => undefined)
    } finally {
      submitLock = false
      uploading = false
      progress = 0
    }
  }

  function onBack() {
    if (dirty && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากฟอร์มไหม?')) return
    push(editClient ? `/c/${encodeURIComponent(editClient.id)}` : '/')
  }

  $effect(() => {
    if (!checking && !isAdmin) replace('/')
  })
</script>

{#if checking}
  <div class="p-8 text-center text-sm text-muted-foreground" role="status">กำลังตรวจสิทธิ์…</div>
{:else if !isAdmin}
  <div class="p-8 text-center text-sm text-muted-foreground" role="status">กำลังนำกลับ…</div>
{:else if hydrating || (id && loadedId !== id)}
  <div class="p-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดข้อมูลสำหรับแก้ไข…</div>
{:else if id && !editClient}
  <div class="mx-auto max-w-3xl px-5 pb-6 pt-6 sm:px-6">
    <div class="rounded-2xl border border-border bg-card p-6 text-center">
      <p class="text-sm text-destructive" role="alert">{loadError ?? 'ไม่พบรายการ'}</p>
      <div class="mt-5 flex justify-center gap-2">
        <button type="button" onclick={() => reloadKey++} class="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ลองใหม่</button>
        <button type="button" onclick={() => push('/')} class="min-h-11 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">กลับ</button>
      </div>
    </div>
  </div>
{:else}
  <div class="pb-4">
    <h1 class="sr-only">{editing ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h1>
    <div class="mx-auto flex w-full max-w-3xl px-5 pb-6 pt-6 sm:px-6">
      <button type="button" onclick={onBack} class="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted"><ArrowLeft class="inline h-3 w-3" aria-hidden /> กลับ</button>
    </div>

    <div class="mx-auto mt-4 max-w-3xl px-5 sm:px-6">
      <div class="overflow-hidden rounded-2xl border border-border bg-card p-1">
        <div class="flex gap-1" role="tablist" aria-label="ขั้นตอนแก้ไข">
          {#each steps as step, index}
            <button type="button" role="tab" aria-selected={tab === index} aria-controls="editor-panel" onclick={() => (tab = index)} class="min-h-11 flex-1 rounded-xl px-3 py-2 text-xs font-medium {tab === index ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}">{step}</button>
          {/each}
        </div>
      </div>
    </div>

    {#if loadError}
      <div class="mx-auto mt-4 max-w-3xl px-5 sm:px-6">
        <div class="flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm" role="status">
          <span>{loadError}</span>
          <button type="button" onclick={() => reloadKey++} class="min-h-11 shrink-0 rounded-full border border-border px-3 text-xs hover:bg-muted">ลองใหม่</button>
        </div>
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="mx-auto mt-6 max-w-3xl px-5 sm:px-6" aria-busy={uploading}>
      <fieldset disabled={readOnly || uploading} class="min-w-0 rounded-2xl border border-border bg-card p-5">
        <div id="editor-panel" role="tabpanel" aria-label={steps[tab]}>
          {#if tab === 0}
            <div class="space-y-4">
              <div class="space-y-1">
                <Label>ชื่อร้านค้า</Label>
                <MultiValueInput values={shopName} onChange={(v) => (shopName = v)} placeholder="ชื่อร้านค้า" maxLength={60} addLabel="เพิ่มชื่อร้าน" inlineAdd />
              </div>
              <div class="space-y-1">
                <Label for="editor-branch">สาขา</Label>
                <Input id="editor-branch" name="branch" autocomplete="off" spellcheck="false" type="text" value={branch} oninput={(e) => (branch = e.currentTarget.value)} maxlength={60} placeholder="สาขา…" />
              </div>
              <FormNameField values={name} onChange={(v) => (name = v)} {dupResult} inlineAdd />
              <FormNotesField value={notes} onChange={(v) => (notes = v)} />
              <FormBadgeField badge={badge} onChange={(v) => (badge = v)} visible />
            </div>
          {:else if tab === 1}
            <div class="space-y-4">
              <div class="space-y-1">
                <Label for="editor-address">ที่อยู่/รายละเอียด</Label>
                <Input id="editor-address" name="address" autocomplete="off" spellcheck="false" type="text" value={address} oninput={(e) => (address = e.currentTarget.value)} maxlength={120} placeholder="บ้านเลขที่ ถนน ตำบล…" />
              </div>
              <LocationSection {lat} {lng} onCoordsChange={(nextLat, nextLng) => { lat = nextLat; lng = nextLng }} />
            </div>
          {:else}
            <div class="space-y-4">
              <PhotoSection images={images} onImagesChange={(v) => (images = v)} {uploading} {thumbs} onThumbsChange={(v) => (thumbs = v)} />
            </div>
          {/if}
        </div>

        {#if error}
          <p class="mt-4 text-[13px] font-medium text-destructive" role="alert">{error}</p>
        {/if}
        {#if uploading}
          <p class="mt-2 font-mono text-xs opacity-60" role="status">อัปโหลด {progress}%</p>
        {/if}

        <div class="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div>
            {#if tab > 0}
              <button type="button" onclick={() => tab--} class="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ย้อนกลับ</button>
            {/if}
          </div>
          <div>
            {#if tab < 2}
              <button type="button" onclick={() => tab++} class="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ถัดไป</button>
            {:else}
              <Button type="submit" class="min-h-11 px-6" disabled={uploading || readOnly || !canSave}>
                {#if editing}<Pencil class="h-4 w-4" aria-hidden />{:else}<Plus class="h-4 w-4" aria-hidden />{/if}
                {uploading ? 'กำลังบันทึก…' : editing ? 'อัปเดตข้อมูล' : 'เพิ่มลูกค้าใหม่'}
              </Button>
            {/if}
          </div>
        </div>
      </fieldset>
      {#if !canSave}
        <p class="mt-2 text-center text-xs opacity-60">ต้องกรอกชื่อร้านหรือชื่อลูกค้าอย่างน้อย 1 ช่อง</p>
      {/if}
    </form>
  </div>
{/if}
