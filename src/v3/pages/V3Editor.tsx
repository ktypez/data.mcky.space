import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { addClient, updateClient } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import { checkDuplicateName } from '@/lib/duplicate-names'
import type { Client } from '@/types'
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

export default function V3Editor(){
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const clients = useClientStore(s=>s.clients)
  const { isAdmin } = useAuthStore()
  const editClient: Client|null = id? clients.find(c=>c.id===id)??null : null
  const editing = !!editClient

  const [name, setName] = useState<string[]>(()=> toArray(editClient?.name))
  const [shopName, setShopName] = useState<string[]>(()=> toArray(editClient?.shopName))
  const [address, setAddress] = useState(()=> editClient?.address ?? '')
  const [lat, setLat] = useState<number|null>(()=> editClient?.lat ?? null)
  const [lng, setLng] = useState<number|null>(()=> editClient?.lng ?? null)
  const [images, setImages] = useState<string[]>(()=> editClient?.images ?? [])
  const [badge, setBadge] = useState<string|null>(()=> editClient?.badge ?? null)
  const [notes, setNotes] = useState<string>(()=> editClient?.notes ?? '')
  const [debouncedName, setDebouncedName] = useState(()=> name.join('\u0000'))
  const debounceRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string|null>(null)
  const [tab, setTab] = useState(0)

  // keep debounced for duplicate check
  useEffect(()=>{
    if(debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(()=> setDebouncedName(name.join('\u0000')), 250)
    return ()=>{ if(debounceRef.current) clearTimeout(debounceRef.current)}
  },[name])

  const dupResult = useMemo(()=>{
    const targets = debouncedName.split('\u0000').map(n=>n.trim()).filter(Boolean)
    if(targets.length===0) return { exact: null, similar: [] as any[] }
    const similarMap = new Map<string, { client: Client; similarity: number }>()
    let exact: Client|null = null
    for(const t of targets){
      const r = checkDuplicateName(clients, t, editClient?.id)
      if(r.exact){ exact = r.exact; break }
      for(const m of r.similar){
        const prev = similarMap.get(m.client.id)
        if(!prev || m.similarity > prev.similarity) similarMap.set(m.client.id, m)
      }
    }
    return { exact, similar: [...similarMap.values()].sort((a,b)=>b.similarity-a.similarity)}
  },[debouncedName, clients, editClient?.id])

  const steps = ['ข้อมูลหลัก','ที่อยู่ & พิกัด','รูปภาพ']
  const canSave = (()=> {
    const cleanName = name.map(n=>n.trim()).filter(Boolean)
    const cleanShop = shopName.map(n=>n.trim()).filter(Boolean)
    return cleanName.length>0 || cleanShop.length>0
  })()

  const handleSubmit = async(e: FormEvent)=>{
    e.preventDefault()
    const cleanName = name.map(n=>n.trim()).filter(Boolean)
    const cleanShop = shopName.map(n=>n.trim()).filter(Boolean)
    if(cleanName.length===0 && cleanShop.length===0) return
    const data: Omit<Client,'createdAt'|'updatedAt'> = {
      id: editClient?.id ?? generateId(),
      name: cleanName,
      shopName: cleanShop,
      address: address.trim(),
      lat, lng, images, badge,
      notes: notes.trim() || null,
    }
    const store = useClientStore.getState()
    const existing = store.clients.find(c=>c.id===data.id)
    try{
      setUploading(true); setProgress(0); setError(null)
      let saved: Client
      if(existing){ const updated: Client={...data, createdAt: existing.createdAt, updatedAt: Date.now()}; saved=await updateClient(updated, setProgress); store.updateClient(saved.id, saved)}
      else{ const nc: Client={...data, createdAt: Date.now(), updatedAt: Date.now()}; saved=await addClient(nc, setProgress); store.addClient(saved)}
      navigate(`/c/${saved.id}`)
    }catch(err){ setError(err instanceof Error? err.message: 'บันทึกไม่สำเร็จ'); store.refresh().catch(()=>undefined)} finally{ setUploading(false); setProgress(0)}
  }

  const onBack = ()=> navigate(editClient? `/c/${editClient.id}` : '/')

  if(!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="pb-28">
      <div className="mx-auto flex w-full max-w-3xl px-6 pt-8">
        <button type="button" onClick={onBack} className="rounded-md border border-black/10 px-2.5 py-1 font-mono text-[11px] hover:bg-black/5"><ArrowLeft className="inline h-3 w-3"/> back</button>
      </div>

      <div className="mx-auto mt-4 max-w-3xl px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-1">
          <div className="flex gap-1">
            {steps.map((s,i)=>(
              <button key={s} type="button" onClick={()=>setTab(i)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium ${i===tab?'bg-foreground text-background':'hover:bg-muted'}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-3xl px-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          {tab===0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>ชื่อร้านค้า *</Label>
                <MultiValueInput values={shopName} onChange={setShopName} placeholder="ชื่อร้านค้า" maxLength={60} addLabel="เพิ่มชื่อร้าน" autoFocus inlineAdd />
              </div>
              <FormNameField values={name} onChange={setName} dupResult={dupResult as any} inlineAdd />
              <FormNotesField value={notes} onChange={setNotes} />
              <FormBadgeField badge={badge} onChange={setBadge} visible />
            </div>
          )}
          {tab===1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="v3-address">ที่อยู่/รายละเอียด</Label>
                <Input id="v3-address" name="address" autoComplete="off" spellCheck={false} type="text" value={address} onChange={e=>setAddress(e.target.value)} maxLength={120} placeholder="บ้านเลขที่ ถนน ตำบล..." />
              </div>
              <LocationSection lat={lat} lng={lng} onCoordsChange={(a,b)=>{setLat(a); setLng(b)}} />
            </div>
          )}
          {tab===2 && (
            <div className="space-y-4">
              <PhotoSection images={images} onImagesChange={setImages} uploading={uploading} />
            </div>
          )}

          {error && <p className="mt-4 text-[13px] font-medium text-destructive" role="alert">{error}</p>}
          {uploading && <p className="mt-2 font-mono text-xs opacity-60">อัปโหลด {progress}%</p>}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <div>
              {tab>0 && <button type="button" onClick={()=>setTab(t=>t-1)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ย้อนกลับ</button>}
            </div>
            <div>
              {tab<2 ? (
                <button type="button" onClick={()=>setTab(t=>t+1)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">ถัดไป</button>
              ) : (
                <Button type="submit" className="h-10 px-6" disabled={uploading || !canSave}>
                  {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {uploading ? 'กำลังอัปโหลด...' : editing ? 'อัปเดตข้อมูล' : 'เพิ่มลูกค้าใหม่'}
                </Button>
              )}
            </div>
          </div>
          {!canSave && <p className="mt-2 text-center text-xs opacity-40">ต้องกรอกชื่อร้านหรือชื่อลูกค้าอย่างน้อย 1 ช่อง</p>}
        </div>
      </form>
    </div>
  )
}
