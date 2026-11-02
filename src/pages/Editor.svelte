<script lang="ts">
  import { push, replace } from 'svelte-spa-router'
  import { untrack } from 'svelte'
  import { ArrowLeft, Plus, Pencil, Crosshair } from 'phosphor-svelte'
  import { useClientStore } from '@/stores/client-store'
  import { useAuthStore } from '@/stores/auth-store'
  import { addClient, fetchClientByIdResult, updateClient } from '@/lib/storage'
  import { generateId } from '@/lib/utils'
  import { showToast } from '@/lib/toast'
  import { askLeave, setFormDirty } from '@/lib/form-dirty'
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
  import Squiggle from '@/components/ui/Squiggle.svelte'

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
  let initialSnapshot = snapshot({ name: [''], shopName: [''], branch: '', address: '', lat: null, lng: null, images: [], badge: null, notes: '' })
  let submitLock = false

  const readBranch = () => branch
  const readAddress = () => address

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
      showToast('บันทึกระเบียนแล้ว')
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
    askLeave(() => push(editClient ? `/c/${encodeURIComponent(editClient.id)}` : '/'))
  }

  $effect(() => {
    if (!checking && !isAdmin) replace('/')
  })
</script>

{#if checking}
  <div class="mx-auto w-full max-w-3xl px-4 py-16 text-center" role="status">
    <p class="text-sm text-ink-soft">กำลังตรวจสิทธิ์…</p>
  </div>
{:else if !isAdmin}
  <div class="mx-auto w-full max-w-3xl px-4 py-16 text-center" role="status">
    <p class="text-sm text-ink-soft">กำลังนำกลับ…</p>
  </div>
{:else if hydrating || (id && loadedId !== id)}
  <div class="mx-auto w-full max-w-3xl px-4 py-16 text-center" role="status">
    <p class="text-sm text-ink-soft">กำลังโหลดข้อมูลสำหรับแก้ไข…</p>
  </div>
{:else if id && !editClient}
  <div class="mx-auto w-full max-w-3xl px-4 py-16">
    <div class="card card-pad text-center">
      <p class="text-sm font-semibold text-danger-ink" role="alert">{loadError ?? 'ไม่พบรายการ'}</p>
      <div class="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onclick={() => reloadKey++} class="btn btn-pop">ลองใหม่</button>
        <button type="button" onclick={() => push('/')} class="btn btn-acc">กลับ</button>
      </div>
    </div>
  </div>
{:else}
  <div class="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6">
    <h1 class="sr-only">{editing ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h1>
    <button type="button" onclick={onBack} class="btn btn-ghost -ml-2 !px-3 text-[13px]"><ArrowLeft class="inline h-3.5 w-3.5" aria-hidden="true" /> กลับ</button>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <h2 class="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{editing ? 'แก้ไขรายการ' : 'รายการใหม่'}</h2>
      {#if dirty && !readOnly}<span role="status" class="chip border-pop-ink/20 bg-pop-tint text-pop-ink">ยังไม่บันทึก</span>{/if}
    </div>
    <Squiggle class="mt-2 h-[6px] w-32 text-acc" />
    <p class="mt-2 text-[13px] leading-relaxed text-ink-soft">
      {#if editing}กำลังแก้ไขระเบียนนี้ — ระบบเก็บข้อมูลเดิมไว้{:else}บรรทัดใหม่ในสมุดทะเบียน — โคดจะถูกกำหนดตอนบันทึก{/if}
    </p>

    {#if loadError}
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-banana/60 bg-banana/15 px-4 py-3 text-sm text-ink" role="status">
        <span>{loadError}</span>
        <button type="button" onclick={() => reloadKey++} class="btn btn-pop !px-3.5 !py-2 text-[12.5px]">ลองใหม่</button>
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="mt-6" aria-busy={uploading}>
      <fieldset disabled={readOnly || uploading} class="min-w-0 space-y-5">
        <!--——— ข้อมูลหลัก ———-->
        <section class="card card-pad">
          <h3 class="label !mb-4">ข้อมูลหลัก</h3>
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <Label>ชื่อร้านค้า</Label>
              <MultiValueInput values={shopName} onChange={(v) => (shopName = v)} placeholder="ชื่อร้านค้า" maxLength={60} addLabel="เพิ่มชื่อร้าน" inlineAdd />
            </div>
            <div>
              <Label for="editor-branch">สาขา</Label>
              <Input syncValue={readBranch} id="editor-branch" name="branch" autocomplete="off" spellcheck="false" type="text" value={branch} oninput={(e) => (branch = e.currentTarget.value)} maxlength={60} placeholder="สาขา…" />
            </div>
            <div>
              <FormBadgeField badge={badge} onChange={(v) => (badge = v)} visible />
            </div>
            <div class="sm:col-span-2">
              <FormNameField values={name} onChange={(v) => (name = v)} {dupResult} inlineAdd />
            </div>
          </div>
        </section>

        <!--——— รูปภาพ ———-->
        <section class="card card-pad">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="label !mb-0">รูปภาพ</h3>
            <span class="text-[11px] font-semibold text-ink-faint">สูงสุด 2 รูป</span>
          </div>
          <div class="mt-4">
            <PhotoSection images={images} onImagesChange={(v) => (images = v)} {uploading} {thumbs} onThumbsChange={(v) => (thumbs = v)} />
          </div>
        </section>

        <!--——— ที่อยู่และโน้ต ———-->
        <section class="card card-pad">
          <h3 class="label !mb-4">ที่อยู่และโน้ต</h3>
          <div class="space-y-5">
            <div>
              <Label for="editor-address">ที่อยู่/รายละเอียด</Label>
              <Input syncValue={readAddress} id="editor-address" name="address" autocomplete="off" spellcheck="false" type="text" value={address} oninput={(e) => (address = e.currentTarget.value)} maxlength={120} placeholder="บ้านเลขที่ ถนน ตำบล…" />
            </div>
            <FormNotesField value={notes} onChange={(v) => (notes = v)} />
          </div>
        </section>

        <!--——— ปักหมุดบนแผนที่ ———-->
        <section class="card overflow-hidden">
          <div class="card-pad flex flex-wrap items-center justify-between gap-3 border-b border-rule">
            <div>
              <h3 class="label !mb-0">ปักหมุดบนแผนที่</h3>
              <p class="mt-2 flex items-center gap-1.5 text-[12px] text-ink-faint">
                <Crosshair class="size-3.5" aria-hidden="true" /> แตะบนแผนที่เพื่อวางหมุด
              </p>
            </div>
            {#if lat !== null && lng !== null}
              <span class="chip border-rule bg-tint font-mono text-acc-ink">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
            {/if}
          </div>
          <LocationSection {lat} {lng} onCoordsChange={(nextLat, nextLng) => { lat = nextLat; lng = nextLng }} />
        </section>
      </fieldset>

      {#if error}
        <p class="mt-4 text-[13px] font-semibold text-danger-ink" role="alert">{error}</p>
      {/if}
      {#if uploading}
        <div class="mt-4" role="status">
          <div class="h-1.5 overflow-hidden rounded-full bg-paper-2"><div class="h-full rounded-full bg-acc transition-[width]" style="width: {progress}%"></div></div>
          <p class="mt-1 font-mono text-xs text-ink-faint">อัปโหลด {progress}%</p>
        </div>
      {/if}

      <!--Sticky action bar — cancel stays reachable while the form is read-only.-->
      <div class="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-ink bg-paper/90 p-3 backdrop-blur-md" style="box-shadow: 4px 4px 0 0 var(--hard);">
        <button type="button" class="btn btn-ghost" onclick={onBack}>ยกเลิก</button>
        <div class="flex flex-wrap items-center gap-3">
          {#if dirty && !readOnly}<span class="chip border-pop-ink/20 bg-pop-tint text-pop-ink">ยังไม่บันทึก</span>{/if}
          <Button type="submit" disabled={uploading || readOnly || !canSave}>
            {#if editing}<Pencil class="h-4 w-4" aria-hidden="true" />{:else}<Plus class="h-4 w-4" aria-hidden="true" />{/if}
            {uploading ? 'กำลังบันทึก…' : editing ? 'บันทึก' : 'เพิ่มในระเบียน'}
          </Button>
        </div>
      </div>

      {#if !canSave}
        <p class="mt-3 text-center text-xs text-ink-faint">ต้องกรอกชื่อร้านหรือชื่อลูกค้าอย่างน้อย 1 ช่อง</p>
      {/if}
    </form>
  </div>
{/if}
