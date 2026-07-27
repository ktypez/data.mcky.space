import { useState, useRef } from 'react'
import { MapPin, Crosshair, MagnifyingGlass } from '@phosphor-icons/react'
import MapPicker from '@/components/MapPickerDynamic'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useGeolocation } from '@/hooks/useGeolocation'

interface LocationSectionProps {
  lat: number | null
  lng: number | null
  onCoordsChange: (lat: number | null, lng: number | null) => void
}

/** Parse lat/lng from various text formats */
function parseCoords(input: string): { lat: number; lng: number } | null {
  const s = input.trim()
  if (!s) return null

  // 1. "lat, lng" or "lat lng" (decimal degrees)
  let m = s.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/)
  if (m) {
    const lat = parseFloat(m[1]), lng = parseFloat(m[2])
    if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
      return { lat, lng }
  }

  // 2. "lat N/S, lng E/W" with hemisphere suffix
  m = s.match(/^(-?\d+\.?\d*)\s*°?\s*([NS]?)\s*[,;\s]\s*(-?\d+\.?\d*)\s*°?\s*([EW]?)$/i)
  if (m) {
    let lat = parseFloat(m[1]), lng = parseFloat(m[3])
    if (m[2].toUpperCase() === 'S') lat = -lat
    if (m[4].toUpperCase() === 'W') lng = -lng
    if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
      return { lat, lng }
  }

  // 3. DMS: "13°45'23\"N 100°29'31\"E"
  m = s.match(/^(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)?"?\s*([NS]?)\s+(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)?"?\s*([EW]?)$/i)
  if (m) {
    let lat = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600
    let lng = parseFloat(m[5]) + parseFloat(m[6]) / 60 + parseFloat(m[7]) / 3600
    if (m[4].toUpperCase() === 'S') lat = -lat
    if (m[8].toUpperCase() === 'W') lng = -lng
    if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
      return { lat, lng }
  }

  return null
}

export default function LocationSection({ lat, lng, onCoordsChange }: LocationSectionProps) {
  const { getCurrentLocation, locating } = useGeolocation()
  const [locQuery, setLocQuery] = useState('')
  const [locSearching, setLocSearching] = useState(false)
  const [locFeedback, setLocFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleGetCurrentLocation = async () => {
    const pos = await getCurrentLocation()
    if (pos) onCoordsChange(pos.lat, pos.lng)
  }

  const searchLocation = async () => {
    const q = locQuery.trim()
    if (!q) return
    setLocSearching(true)
    setLocFeedback(null)

    const coords = parseCoords(q)
    if (coords) {
      onCoordsChange(coords.lat, coords.lng)
      setLocQuery('')
      setLocFeedback({ ok: true, msg: `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` })
      setLocSearching(false)
      return
    }

    try {
      const { OpenLocationCode } = await import('open-location-code')
      const olc = new OpenLocationCode()
      const code = (q.match(/[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i) || [])[0] || q
      if (olc.isValid(code)) {
        let d: { latitudeCenter: number; longitudeCenter: number }
        if (olc.isFull(code)) {
          d = olc.decode(code)
        } else if (olc.isShort(code)) {
          d = olc.decode(olc.recoverNearest(code, lat ?? 16.4322, lng ?? 102.8236))
        } else {
          setLocFeedback({ ok: false, msg: 'ไม่รู้จักพิกัดนี้ — ลองละติจูด,ลองจิจูด เช่น 13.7563, 100.5018' })
          setLocSearching(false)
          return
        }
        onCoordsChange(d.latitudeCenter, d.longitudeCenter)
        setLocQuery('')
        setLocFeedback({ ok: true, msg: `📍 ${d.latitudeCenter.toFixed(4)}, ${d.longitudeCenter.toFixed(4)}` })
      } else {
        setLocFeedback({ ok: false, msg: 'ไม่รู้จักพิกัดนี้ — ลองละติจูด,ลองจิจูด เช่น 13.7563, 100.5018' })
      }
    } catch {
      setLocFeedback({ ok: false, msg: 'ไม่สามารถโหลดตัวถอดรหัส Plus Code ได้' })
    } finally {
      setLocSearching(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" /> ตำแหน่ง
      </Label>
      <MapPicker
        lat={lat}
        lng={lng}
        onChange={(la, ln) => onCoordsChange(la, ln)}
      />
      <div className="flex gap-1.5">
        <Input
          type="text"
          value={locQuery}
          onChange={(e) => { setLocQuery(e.target.value); setLocFeedback(null) }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
          placeholder="ละติจูด, ลองจิจูด หรือ Plus Code"
          className="flex-1"
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
      {locFeedback && (
        <p className={`text-[13px] ${locFeedback.ok ? 'text-success' : 'text-destructive'}`}>
          {locFeedback.msg}
        </p>
      )}
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
  )
}