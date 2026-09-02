
import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import type { Client } from '@/types/index'
import { checkDuplicateName, type DuplicateResult } from '@/lib/duplicate-names'
import { generateId } from '@/lib/utils'
import { X } from '@phosphor-icons/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/old/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import LocationSection from '@/components/LocationSection'
import PhotoSection from '@/components/PhotoSection'
import FormNameField from '@/components/FormNameField'
import FormNotesField from '@/components/FormNotesField'
import FormBadgeField from '@/components/FormBadgeField'
import FormSubmitButtons from '@/old/components/FormSubmitButtons'
import MultiValueInput from '@/components/MultiValueInput'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (client: Omit<Client, 'createdAt' | 'updatedAt'>) => void
  editClient?: Client
  existingClients: Client[]
  variant?: 'sheet' | 'inline'
  uploading?: boolean
  uploadProgress?: number
  error?: string | null
}

/** Normalize an incoming value into a non-empty string array. */
function toArray(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.length > 0 ? [...v] : ['']
  return [v ?? '']
}

export default function AddClientForm({
  open,
  onOpenChange,
  onSave,
  editClient,
  existingClients,
  variant = 'sheet',
  uploading,
  error,
}: Props) {
  const [name, setName] = useState<string[]>(() => toArray(editClient?.name))
  const [shopName, setShopName] = useState<string[]>(() => toArray(editClient?.shopName))
  const [address, setAddress] = useState(() => editClient?.address ?? '')
  const [lat, setLat] = useState<number | null>(() => editClient?.lat ?? null)
  const [lng, setLng] = useState<number | null>(() => editClient?.lng ?? null)
  const [images, setImages] = useState<string[]>(() => editClient?.images ?? [])
  const [badge, setBadge] = useState<string | null>(() => editClient?.badge ?? null)
  const [notes, setNotes] = useState<string>(() => editClient?.notes ?? '')
  const [debouncedName, setDebouncedName] = useState(() => name.join('\u0000'))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editing = !!editClient

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedName(name.join('\u0000')), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [name])

  const dupResult = useMemo<DuplicateResult>(() => {
    const targets = debouncedName.split('\u0000').map((n) => n.trim()).filter(Boolean)
    if (targets.length === 0) return { exact: null, similar: [] }
    // Aggregate exact + similar across every non-empty name value.
    const similarMap = new Map<string, { client: Client; similarity: number }>()
    let exact: Client | null = null
    for (const t of targets) {
      const r = checkDuplicateName(existingClients, t, editClient?.id)
      if (r.exact) { exact = r.exact; break }
      for (const m of r.similar) {
        const prev = similarMap.get(m.client.id)
        if (!prev || m.similarity > prev.similarity) similarMap.set(m.client.id, m)
      }
    }
    return {
      exact,
      similar: [...similarMap.values()].sort((a, b) => b.similarity - a.similarity),
    }
  }, [debouncedName, existingClients, editClient?.id])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const cleanName = name.map((n) => n.trim()).filter(Boolean)
    const cleanShopName = shopName.map((n) => n.trim()).filter(Boolean)
    if (cleanName.length === 0 && cleanShopName.length === 0) return
    onSave({
      id: editClient?.id ?? generateId(),
      name: cleanName,
      shopName: cleanShopName,
      address: address.trim(),
      lat,
      lng,
      images,
      badge,
      notes: notes.trim() || null,
    })
    onOpenChange(false)
  }

  const handleCoordsChange = (newLat: number | null, newLng: number | null) => {
    setLat(newLat)
    setLng(newLng)
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Shop Name */}
      <div className="space-y-1">
        <Label>ชื่อร้านค้า *</Label>
        <MultiValueInput
          values={shopName}
          onChange={setShopName}
          placeholder="ชื่อร้านค้า"
          maxLength={60}
          addLabel="เพิ่มชื่อร้าน"
          autoFocus
        />
        {name.every((n) => !n.trim()) && shopName.every((n) => !n.trim()) && (
          <p className="text-[13px] text-destructive">กรุณากรอกชื่อลูกค้า หรือ ชื่อร้านค้า อย่างน้อย 1 อย่าง</p>
        )}
      </div>

      <FormNameField
        values={name}
        onChange={setName}
        dupResult={dupResult}
      />

      {/* Address / Details */}
      <div className="space-y-1">
        <Label>ที่อยู่/รายละเอียด</Label>
        <Input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={120}
        />
      </div>

      <LocationSection lat={lat} lng={lng} onCoordsChange={handleCoordsChange} />
      <PhotoSection images={images} onImagesChange={setImages} uploading={uploading} />
      <FormNotesField value={notes} onChange={setNotes} />
      <FormBadgeField badge={badge} onChange={setBadge} visible />
      {error && (
        <p className="text-[13px] font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      <FormSubmitButtons editing={editing} uploading={uploading} onCancel={() => onOpenChange(false)} />
    </form>
  )

  if (variant === 'inline') {
    if (!open) return null
    return formContent
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="p-0 gap-0 overflow-hidden bg-card border-l border-border"
      >
        <SheetHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-base font-bold text-foreground">
            {editing ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}
          </SheetTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="default"
              size="icon-xs"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-5 pb-5 pt-4">{formContent}</div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
