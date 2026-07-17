
import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import type { Client } from '@/types'
import { checkDuplicateName } from '@/lib/duplicate-names'
import { generateId } from '@/lib/utils'
import { useGeolocation } from '@/hooks/useGeolocation'
import MapPicker from '@/components/MapPickerDynamic'
import PhotoUploadModal from '@/components/PhotoUploadModal'
import AppImage from '@/components/AppImage'
import { getBadgePreset } from '@/components/BadgeTag'
import { Switch } from '@/components/ui/switch'
import { MapPin, X, Crosshair, MagnifyingGlass, Warning, Plus, Pencil, Camera } from '@phosphor-icons/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

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
  const { getCurrentLocation, locating } = useGeolocation()
  const [locQuery, setLocQuery] = useState('')
  const [locSearching, setLocSearching] = useState(false)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
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

  const handleGetCurrentLocation = async () => {
    const pos = await getCurrentLocation()
    if (pos) {
      setLat(pos.lat)
      setLng(pos.lng)
    }
  }

  const searchLocation = async () => {
    const q = locQuery.trim()
    if (!q) return
    setLocSearching(true)
    try {
      const m = q.match(/^(-?\d+\.?\d*)\s*[,,\s]\s*(-?\d+\.?\d*)$/)
      if (m) {
        const la = parseFloat(m[1]),
          ln = parseFloat(m[2])
        if (la >= -90 && la <= 90 && ln >= -180 && ln <= 180) {
          setLat(la)
          setLng(ln)
          return
        }
      }
      try {
        const { OpenLocationCode } = await import('open-location-code')
        const olc = new OpenLocationCode()
        const c =
          (q.match(/[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i) || [])[0] || q
        if (olc.isValid(c)) {
          if (olc.isFull(c)) {
            const d = olc.decode(c)
            setLat(d.latitudeCenter)
            setLng(d.longitudeCenter)
          } else if (olc.isShort(c)) {
            const d = olc.decode(olc.recoverNearest(c, lat ?? 16.4322, lng ?? 102.8236))
            setLat(d.latitudeCenter)
            setLng(d.longitudeCenter)
          }
        }
      } catch {}
    } catch {
    } finally {
      setLocSearching(false)
    }
  }

  const inputClass =
    'w-full h-10 px-3 text-[16px] font-sans rounded-[6px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-blue)] transition-colors placeholder:text-[var(--text-muted)]'
  const inputErrorClass = 'border-[var(--destructive)] focus:border-[var(--destructive)]'
  const labelClass = 'text-[14px] font-semibold text-[var(--text-muted)]'

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1">
        <label className={labelClass}>ชื่อลูกค้า</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          className={`${inputClass} ${hasConflict ? inputErrorClass : ''}`}
        />
        {hasConflict && (
          <div className="flex items-start gap-2 py-2 px-3 rounded-[6px] bg-[var(--destructive)]/10 border border-[var(--destructive)]/40 text-[13px] text-[var(--destructive)]">
            <Warning className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {dupResult.exact && (
                <>
                  มีชื่อ &ldquo;{dupResult.exact.name}&rdquo; อยู่แล้ว
                  {dupResult.exact.shopName ? ` (${dupResult.exact.shopName})` : ''}
                </>
              )}
              {!dupResult.exact && dupResult.similar.length > 0 && (
                <>
                  ชื่อคล้าย:{' '}
                  {dupResult.similar
                    .map(
                      (m) =>
                        `${m.client.name}${m.client.shopName ? ` (${m.client.shopName})` : ''}`,
                    )
                    .join(', ')}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Shop Name */}
      <div className="space-y-1">
        <label className={labelClass}>ชื่อร้านค้า *</label>
        <input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          maxLength={60}
          className={inputClass}
        />
        {!name.trim() && !shopName.trim() && (
          <p className="text-[13px] text-[var(--destructive)]">กรุณากรอกชื่อลูกค้า หรือ ชื่อร้านค้า อย่างน้อย 1 อย่าง</p>
        )}
      </div>

      {/* Address / Details */}
      <div className="space-y-1">
        <label className={labelClass}>ที่อยู่/รายละเอียด</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={120}
          className={inputClass}
        />
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label className={`${labelClass} flex items-center gap-1`}>
          <MapPin className="w-3.5 h-3.5" /> ตำแหน่ง
        </label>
        <MapPicker
          lat={lat}
          lng={lng}
          onChange={(la, ln) => {
            setLat(la)
            setLng(ln)
          }}
        />
        <div className="flex gap-1.5">
          <input
            type="text"
            value={locQuery}
            onChange={(e) => setLocQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
            placeholder="พิกัด หรือ Plus Code"
            className={`${inputClass} flex-1`}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={searchLocation}
            aria-label="ค้นหาตำแหน่ง"
            disabled={locSearching || !locQuery.trim()}
          >
            {locSearching ? (
              <span className="text-xs">...</span>
            ) : (
              <MagnifyingGlass className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-[13px] font-semibold text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)]"
            onClick={handleGetCurrentLocation}
            disabled={locating}
          >
            <Crosshair className="w-3.5 h-3.5" />
            {locating ? 'กำลังค้นหา...' : 'ใช้ตำแหน่งปัจจุบัน'}
          </Button>
          <span className="text-[13px] text-[var(--text-muted)]/60">หรือแตะบนแผนที่</span>
        </div>
      </div>

      {/* Photo */}
      <div className="space-y-1">
        <label className={labelClass}>รูปร้านค้า</label>
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)]">
              {(src.startsWith('data:image') || src.startsWith('http')) ? (
                <AppImage src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--surface)] flex items-center justify-center text-xs text-[var(--text-muted)]">?</div>
              )}
              <Button
                variant="default"
                size="icon-xs"
                className="absolute top-0.5 right-0.5 rounded-full"
                onClick={() => setImages(images.filter((_, j) => j !== i))}
                disabled={uploading}
                aria-label="ลบรูปภาพ"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {images.length < 2 && (
            <Button
              type="button"
              variant="outline"
              className="w-20 h-20 rounded-lg border-dashed flex flex-col gap-1"
              onClick={() => setPhotoModalOpen(true)}
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{images.length}/2</span>
            </Button>
          )}
        </div>
          <PhotoUploadModal
            open={photoModalOpen}
            onOpenChange={setPhotoModalOpen}
            onCompressed={(dataUrl) => setImages([...images, dataUrl])}
          />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className={labelClass}>บันทึก</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          className={`${inputClass} h-auto py-2 resize-y`}
        />
      </div>

      {/* Badge (edit only) */}
      {editing && (() => {
        const preset = getBadgePreset(badge)
        return (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
            <span className={`text-[15px] font-medium ${preset ? preset.text : 'text-[var(--text-muted)]'}`}>
              {preset ? preset.label : 'ไม่มี badge'}
            </span>
            <Switch
              checked={badge === 'penpay'}
              onCheckedChange={(checked) => setBadge(checked ? 'penpay' : null)}
            />
          </div>
        )
      })()}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12"
          onClick={() => onOpenChange(false)}
        >
          ยกเลิก
        </Button>
        <Button type="submit" className="flex-1 h-12" disabled={uploading}>
          {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {uploading ? 'กำลังอัปโหลด...' : editing ? 'อัปเดตข้อมูล' : 'เพิ่มลูกค้าใหม่'}
        </Button>
      </div>
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
        className="p-0 gap-0 overflow-hidden bg-[var(--card)] border-l border-[var(--border)]"
        showCloseButton={false}
      >
        <SheetHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <SheetTitle className="text-base font-bold text-[var(--text-primary)]">
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
