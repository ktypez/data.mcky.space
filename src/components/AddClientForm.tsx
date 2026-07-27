
import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import type { Client } from '@/types'
import { checkDuplicateName } from '@/lib/duplicate-names'
import { generateId } from '@/lib/utils'
import { X } from '@phosphor-icons/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import LocationSection from '@/components/LocationSection'
import PhotoSection from '@/components/PhotoSection'
import FormNameField from '@/components/FormNameField'
import FormNotesField from '@/components/FormNotesField'
import FormBadgeField from '@/components/FormBadgeField'
import FormSubmitButtons from '@/components/FormSubmitButtons'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (client: Omit<Client, 'createdAt' | 'updatedAt'>) => void
  editClient?: Client
  existingClients: Client[]
  variant?: 'sheet' | 'inline'
  uploading?: boolean
  uploadProgress?: number
}

export default function AddClientForm({
  open,
  onOpenChange,
  onSave,
  editClient,
  existingClients,
  variant = 'sheet',
  uploading,
  uploadProgress,
}: Props) {
  const [name, setName] = useState(() => editClient?.name ?? '')
  const [shopName, setShopName] = useState(() => editClient?.shopName ?? '')
  const [address, setAddress] = useState(() => editClient?.address ?? '')
  const [lat, setLat] = useState<number | null>(() => editClient?.lat ?? null)
  const [lng, setLng] = useState<number | null>(() => editClient?.lng ?? null)
  const [images, setImages] = useState<string[]>(() => editClient?.images ?? [])
  const [badge, setBadge] = useState<string | null>(() => editClient?.badge ?? null)
  const [notes, setNotes] = useState<string>(() => editClient?.notes ?? '')
  const [debouncedName, setDebouncedName] = useState(() => editClient?.name ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editing = !!editClient

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedName(name), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [name])

  const dupResult = useMemo(() => {
    const target = debouncedName.trim()
    if (!target) return { exact: null, similar: [] }
    return checkDuplicateName(existingClients, target, editClient?.id)
  }, [debouncedName, existingClients, editClient?.id])

  const hasConflict = !!(dupResult.exact || dupResult.similar.length > 0)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() && !shopName.trim()) return
    onSave({
      id: editClient?.id ?? generateId(),
      name: name.trim(),
      shopName: shopName.trim(),
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
      <FormNameField
        value={name}
        onChange={setName}
        hasConflict={hasConflict}
        dupResult={dupResult}
        autoFocus
      />

      {/* Shop Name */}
      <div className="space-y-1">
        <Label>ชื่อร้านค้า *</Label>
        <Input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          maxLength={60}
        />
        {!name.trim() && !shopName.trim() && (
          <p className="text-[13px] text-destructive">กรุณากรอกชื่อลูกค้า หรือ ชื่อร้านค้า อย่างน้อย 1 อย่าง</p>
        )}
      </div>

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
      <FormBadgeField badge={badge} onChange={setBadge} visible={editing} />
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
        side="right"
        className="p-0 gap-0 overflow-hidden bg-card border-l border-border"
        showCloseButton={false}
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
