import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { addClient, fetchClientByIdResult, updateClient } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import { setFormDirty } from '@/lib/form-dirty'
import { checkDuplicateName, type DuplicateResult } from '@/lib/duplicate-names'
import type { Client } from '@/types/index'
import MultiValueInput from '@/components/MultiValueInput'
import FormNameField from '@/components/FormNameField'
import FormNotesField from '@/components/FormNotesField'
import FormBadgeField from '@/components/FormBadgeField'
import LocationSection from '@/components/LocationSection'
import PhotoSection from '@/components/PhotoSection'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Pencil } from '@phosphor-icons/react'

function toArray(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.length > 0 ? [...v] : ['']
  return [v ?? '']
}

type FormSnapshot = {
  name: string[]
  shopName: string[]
  branch: string
  address: string
  lat: number | null
  lng: number | null
  images: string[]
  badge: string | null
  notes: string
}

function snapshot(values: FormSnapshot): string {
  return JSON.stringify(values)
}

export default function EditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const clients = useClientStore(s => s.clients)
  const { isAdmin, checking } = useAuthStore()
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(id ?? null)
  const [hydrating, setHydrating] = useState(Boolean(id))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [name, setName] = useState<string[]>([''])
  const [shopName, setShopName] = useState<string[]>([''])
  const [branch, setBranch] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({})
  const [badge, setBadge] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [debouncedName, setDebouncedName] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState(0)
  const initialSnapshotRef = useRef(snapshot({ name: [''], shopName: [''], branch: '', address: '', lat: null, lng: null, images: [], badge: null, notes: '' }))
  const submitLockRef = useRef(false)
  const editing = Boolean(editClient)

  const applyForm = (client: Client | null) => {
    const nextName = toArray(client?.name)
    const nextShopName = toArray(client?.shopName)
    const nextBranch = client?.branch ?? ''
    const nextAddress = client?.address ?? ''
    const nextLat = client?.lat ?? null
    const nextLng = client?.lng ?? null
    const nextImages = client?.images ?? []
    const nextBadge = client?.badge ?? null
    const nextNotes = client?.notes ?? ''
    setEditClient(client)
    setName(nextName)
    setShopName(nextShopName)
    setBranch(nextBranch)
    setAddress(nextAddress)
    setLat(nextLat)
    setLng(nextLng)
    setImages(nextImages)
    setBadge(nextBadge)
    setNotes(nextNotes)
    setThumbs({})
    setDebouncedName(nextName.join('\u0000'))
    setTab(0)
    initialSnapshotRef.current = snapshot({ name: nextName, shopName: nextShopName, branch: nextBranch, address: nextAddress, lat: nextLat, lng: nextLng, images: nextImages, badge: nextBadge, notes: nextNotes })
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!id) {
        applyForm(null)
        setLoadedId(null)
        setHydrating(false)
        setLoadError(null)
        return
      }
      if (!isAdmin) {
        setHydrating(false)
        return
      }

      setLoadedId(null)
      setHydrating(true)
      setLoadError(null)
      try {
        const result = await fetchClientByIdResult(id)
        if (cancelled) return
        if (result.status === 'found') {
          applyForm(result.client)
          useClientStore.getState().upsertClient(result.client)
          setLoadError(null)
        } else if (result.status === 'offline' && result.client) {
          applyForm(result.client)
          useClientStore.getState().upsertClient(result.client)
          setLoadError('ออฟไลน์ — แก้ไขไม่ได้จนกว่าจะเชื่อมต่ออินเทอร์เน็ต')
        } else {
          applyForm(null)
          setLoadError(result.status === 'not-found' ? 'ไม่พบรายการที่ต้องการแก้ไข' : 'โหลดข้อมูลไม่สำเร็จ — ลองใหม่หรือกลับไปหน้าหลัก')
        }
      } catch {
        if (!cancelled) {
          applyForm(null)
          setLoadError('โหลดข้อมูลไม่สำเร็จ — ลองใหม่หรือกลับไปหน้าหลัก')
        }
      } finally {
        if (!cancelled) {
          setLoadedId(id)
          setHydrating(false)
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id, isAdmin, reloadKey])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedName(name.join('\u0000')), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [name])

  const currentSnapshot = snapshot({ name, shopName, branch, address, lat, lng, images, badge, notes })
  const dirty = currentSnapshot !== initialSnapshotRef.current
  const readOnly = Boolean(loadError) || hydrating || checking

  useEffect(() => {
    setFormDirty(dirty && !readOnly)
    return () => setFormDirty(false)
  }, [dirty, readOnly])

  useEffect(() => {
    if (!dirty || readOnly) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, readOnly])

  const dupResult: DuplicateResult = useMemo(() => {
    const targets = debouncedName.split('\u0000').map(n => n.trim()).filter(Boolean)
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
  }, [debouncedName, clients, editClient?.id])

  const steps = ['ข้อมูลหลัก', 'ที่อยู่ & พิกัด', 'รูปภาพ']
  const canSave = name.some(value => value.trim()) || shopName.some(value => value.trim())

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitLockRef.current || readOnly || !canSave) return
    submitLockRef.current = true
    const cleanName = name.map(value => value.trim()).filter(Boolean)
    const cleanShopName = shopName.map(value => value.trim()).filter(Boolean)
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
    const existing = editClient ?? store.clients.find(client => client.id === data.id)
    try {
      setUploading(true)
      setProgress(0)
      setError(null)
      let saved: Client
      if (existing) {
        const updated: Client = { ...data, createdAt: existing.createdAt, updatedAt: Date.now() }
        saved = await updateClient(updated, setProgress, thumbs)
      } else {
        const created: Client = { ...data, createdAt: Date.now(), updatedAt: Date.now() }
        saved = await addClient(created, setProgress, thumbs)
      }
      store.upsertClient(saved)
      navigate(`/c/${encodeURIComponent(saved.id)}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'บันทึกไม่สำเร็จ')
      void store.refresh().catch(() => undefined)
    } finally {
      submitLockRef.current = false
      setUploading(false)
      setProgress(0)
    }
  }

  const onBack = () => {
    if (dirty && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากฟอร์มไหม?')) return
    navigate(editClient ? `/c/${encodeURIComponent(editClient.id)}` : '/')
  }

  if (checking) return <EditorStatus>กำลังตรวจสิทธิ์…</EditorStatus>
  if (!isAdmin) return <Navigate to="/" replace />
  if (hydrating || (id && loadedId !== id)) return <EditorStatus>กำลังโหลดข้อมูลสำหรับแก้ไข…</EditorStatus>
  if (id && !editClient) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-6">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-destructive" role="alert">{loadError ?? 'ไม่พบรายการ'}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => setReloadKey(value => value + 1)} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ลองใหม่</button>
            <button type="button" onClick={() => navigate('/')} className="min-h-11 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">กลับ</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <h1 className="sr-only">{editing ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h1>
      <div className="mx-auto flex w-full max-w-3xl px-6 pt-6">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted"><ArrowLeft className="inline h-3 w-3" aria-hidden /> กลับ</button>
      </div>

      <div className="mx-auto mt-4 max-w-3xl px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-1">
          <div className="flex gap-1" role="tablist" aria-label="ขั้นตอนแก้ไข">
            {steps.map((step, index) => (
              <button key={step} type="button" role="tab" aria-selected={tab === index} aria-controls="editor-panel" onClick={() => setTab(index)} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-xs font-medium ${tab === index ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{step}</button>
            ))}
          </div>
        </div>
      </div>

      {loadError && <div className="mx-auto mt-4 max-w-3xl px-6"><div className="flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm" role="status"><span>{loadError}</span><button type="button" onClick={() => setReloadKey(value => value + 1)} className="min-h-11 shrink-0 rounded-full border border-border px-3 text-xs hover:bg-muted">ลองใหม่</button></div></div>}

      <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-3xl px-6" aria-busy={uploading}>
        <fieldset disabled={readOnly || uploading} className="min-w-0 rounded-2xl border border-border bg-card p-5">
          <div id="editor-panel" role="tabpanel" aria-label={steps[tab]}>
            {tab === 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>ชื่อร้านค้า</Label>
                  <MultiValueInput values={shopName} onChange={setShopName} placeholder="ชื่อร้านค้า" maxLength={60} addLabel="เพิ่มชื่อร้าน" inlineAdd />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editor-branch">สาขา</Label>
                  <Input id="editor-branch" name="branch" autoComplete="off" spellCheck={false} type="text" value={branch} onChange={event => setBranch(event.target.value)} maxLength={60} placeholder="สาขา…" />
                </div>
                <FormNameField values={name} onChange={setName} dupResult={dupResult} inlineAdd />
                <FormNotesField value={notes} onChange={setNotes} />
                <FormBadgeField badge={badge} onChange={setBadge} visible />
              </div>
            )}
            {tab === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="editor-address">ที่อยู่/รายละเอียด</Label>
                  <Input id="editor-address" name="address" autoComplete="off" spellCheck={false} type="text" value={address} onChange={event => setAddress(event.target.value)} maxLength={120} placeholder="บ้านเลขที่ ถนน ตำบล…" />
                </div>
                <LocationSection lat={lat} lng={lng} onCoordsChange={(nextLat, nextLng) => { setLat(nextLat); setLng(nextLng) }} />
              </div>
            )}
            {tab === 2 && (
              <div className="space-y-4">
                <PhotoSection images={images} onImagesChange={setImages} uploading={uploading} thumbs={thumbs} onThumbsChange={setThumbs} />
              </div>
            )}
          </div>

          {error && <p className="mt-4 text-[13px] font-medium text-destructive" role="alert">{error}</p>}
          {uploading && <p className="mt-2 font-mono text-xs opacity-60" role="status">อัปโหลด {progress}%</p>}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <div>{tab > 0 && <button type="button" onClick={() => setTab(current => current - 1)} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ย้อนกลับ</button>}</div>
            <div>
              {tab < 2 ? (
                <button type="button" onClick={() => setTab(current => current + 1)} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ถัดไป</button>
              ) : (
                <Button type="submit" className="min-h-11 px-6" disabled={uploading || readOnly || !canSave}>
                  {editing ? <Pencil className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                  {uploading ? 'กำลังบันทึก…' : editing ? 'อัปเดตข้อมูล' : 'เพิ่มลูกค้าใหม่'}
                </Button>
              )}
            </div>
          </div>
        </fieldset>
        {!canSave && <p className="mt-2 text-center text-xs opacity-60">ต้องกรอกชื่อร้านหรือชื่อลูกค้าอย่างน้อย 1 ช่อง</p>}
      </form>
    </div>
  )
}

function EditorStatus({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-muted-foreground" role="status">{children}</div>
}
