
import { useState, type FormEvent } from 'react'
import type { Client } from '@/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { apiFetch } from '@/lib/api'
import MapPicker from '@/components/MapPickerDynamic'
import { MapPin, Crosshair, PaperPlaneTilt, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Spinner from '@/components/ui/spinner'

interface Props {
  client: Client
  onClose: () => void
}

export default function SuggestEditForm({ client, onClose }: Props) {
  const [name, setName] = useState(client.name)
  const [shopName, setShopName] = useState(client.shopName)
  const [address, setAddress] = useState(client.address)
  const [lat, setLat] = useState<number | null>(client.lat)
  const [lng, setLng] = useState<number | null>(client.lng)
  const { getCurrentLocation, locating } = useGeolocation()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const hasChanges =
    name !== client.name ||
    shopName !== client.shopName ||
    address !== client.address ||
    lat !== client.lat ||
    lng !== client.lng

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() && !shopName.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await apiFetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          suggested: {
            name: name.trim(),
            shopName: shopName.trim(),
            address: address.trim(),
            lat,
            lng,
          },
          original: {
            name: client.name,
            shopName: client.shopName,
            address: client.address,
            lat: client.lat,
            lng: client.lng,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'ส่งคำแนะนำไม่สำเร็จ')
      }

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGetCurrentLocation = async () => {
    const pos = await getCurrentLocation()
    if (pos) {
      setLat(pos.lat)
      setLng(pos.lng)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="w-10 h-10 text-success" />
        <p className="text-base font-bold text-foreground">
          ส่งคำแนะนำเรียบร้อย!
        </p>
        <p className="text-sm text-muted-foreground">ผู้ดูแลจะตรวจสอบและอัปเดตข้อมูลให้เร็วที่สุด</p>
        <Button variant="link" onClick={onClose}>
          ปิด
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-1 block">ชื่อ</Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อลูกค้า"
          maxLength={200}
        />
      </div>

      <div>
        <Label className="mb-1 block">ชื่อร้าน</Label>
        <Input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="ชื่อร้านค้า"
        />
      </div>

      <div>
        <Label className="mb-1 block">ที่อยู่/รายละเอียด</Label>
        <Input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="ที่อยู่"
          maxLength={200}
        />
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> ตำแหน่ง
        </Label>
        <MapPicker
          lat={lat}
          lng={lng}
          onChange={(la, ln) => {
            setLat(la)
            setLng(ln)
          }}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-[13px] font-semibold text-accent hover:text-accent/80"
            onClick={handleGetCurrentLocation}
            disabled={locating}
          >
            <Crosshair className="w-3.5 h-3.5" />
            {locating ? 'กำลังค้นหา...' : 'ใช้ตำแหน่งปัจจุบัน'}
          </Button>
          <span className="text-[13px] text-muted-foreground/60">หรือแตะบนแผนที่</span>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm">{error}</div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-12" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12"
          disabled={submitting || !hasChanges || (!name.trim() && !shopName.trim())}
        >
          {submitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <PaperPlaneTilt className="w-3.5 h-3.5" />
              ส่งคำแนะนำ
            </>
          )}
        </Button>
      </div>

      <p className="text-[13px] text-muted-foreground text-center">
        คำแนะนำของคุณจะถูกส่งให้ผู้ดูแลตรวจสอบก่อนอัปเดตข้อมูล
      </p>
    </form>
  )
}
