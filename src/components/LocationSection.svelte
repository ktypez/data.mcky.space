<script lang="ts">
  import { MapPin, Crosshair, MagnifyingGlass } from 'phosphor-svelte'
  import MapPicker from '@/components/MapPickerDynamic.svelte'
  import Input from '@/components/ui/Input.svelte'
  import Label from '@/components/ui/Label.svelte'
  import Button from '@/components/ui/Button.svelte'
  import { createGeolocation } from '@/lib/create-geolocation.svelte'

  let { lat, lng, onCoordsChange }: { lat: number | null; lng: number | null; onCoordsChange: (lat: number | null, lng: number | null) => void } = $props()

  const geo = createGeolocation()
  let locQuery = $state('')
  const readLocQuery = () => locQuery
  let locSearching = $state(false)
  let locFeedback = $state<{ ok: boolean; msg: string } | null>(null)

  function parseCoords(input: string): { lat: number; lng: number } | null {
    const s = input.trim()
    if (!s) return null
    let m = s.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/)
    if (m) {
      const lat = parseFloat(m[1])
      const lng = parseFloat(m[2])
      if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng }
    }
    m = s.match(/^(-?\d+\.?\d*)\s*°?\s*([NS]?)\s*[,;\s]\s*(-?\d+\.?\d*)\s*°?\s*([EW]?)$/i)
    if (m) {
      let lat = parseFloat(m[1])
      let lng = parseFloat(m[3])
      if (m[2].toUpperCase() === 'S') lat = -lat
      if (m[4].toUpperCase() === 'W') lng = -lng
      if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng }
    }
    m = s.match(/^(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)?"?\s*([NS]?)\s+(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)?"?\s*([EW]?)$/i)
    if (m) {
      let lat = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600
      let lng = parseFloat(m[5]) + parseFloat(m[6]) / 60 + parseFloat(m[7]) / 3600
      if (m[4].toUpperCase() === 'S') lat = -lat
      if (m[8].toUpperCase() === 'W') lng = -lng
      if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng }
    }
    return null
  }

  async function handleGetCurrentLocation() {
    const pos = await geo.getCurrentLocation()
    if (pos) onCoordsChange(pos.lat, pos.lng)
  }

  async function searchLocation() {
    const q = locQuery.trim()
    if (!q) return
    locSearching = true
    locFeedback = null
    const coords = parseCoords(q)
    if (coords) {
      onCoordsChange(coords.lat, coords.lng)
      locQuery = ''
      locFeedback = { ok: true, msg: `ตำแหน่ง: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` }
      locSearching = false
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
          locFeedback = { ok: false, msg: 'ไม่รู้จักพิกัดนี้ — ลองละติจูด,ลองจิจูด เช่น 13.7563, 100.5018' }
          locSearching = false
          return
        }
        onCoordsChange(d.latitudeCenter, d.longitudeCenter)
        locQuery = ''
        locFeedback = { ok: true, msg: `ตำแหน่ง: ${d.latitudeCenter.toFixed(4)}, ${d.longitudeCenter.toFixed(4)}` }
      } else {
        locFeedback = { ok: false, msg: 'ไม่รู้จักพิกัดนี้ — ลองละติจูด,ลองจิจูด เช่น 13.7563, 100.5018' }
      }
    } catch {
      locFeedback = { ok: false, msg: 'ไม่สามารถโหลดตัวถอดรหัส Plus Code ได้' }
    } finally {
      locSearching = false
    }
  }
</script>

<div class="space-y-1.5">
  <Label for="location-query" class="flex items-center gap-1">
    <MapPin class="w-3.5 h-3.5" aria-hidden /> ตำแหน่ง
  </Label>
  <MapPicker {lat} {lng} onChange={(la, ln) => onCoordsChange(la, ln)} />
  <div class="flex gap-1.5">
    <Input
      id="location-query"
      name="location-query"
      type="text"
      syncValue={readLocQuery}
      value={locQuery}
      oninput={(e) => {
        locQuery = e.currentTarget.value
        locFeedback = null
      }}
      onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
      placeholder="ละติจูด, ลองจิจูด หรือ Plus Code"
      class="flex-1"
    />
    <Button type="button" variant="outline" size="icon" onclick={searchLocation} aria-label="ค้นหาตำแหน่ง" disabled={locSearching || !locQuery.trim()}>
      {#if locSearching}
        <span class="text-xs">…</span>
      {:else}
        <MagnifyingGlass class="w-3.5 h-3.5" />
      {/if}
    </Button>
  </div>
  {#if locFeedback}
    <p role="status" class="text-[13px] {locFeedback.ok ? 'text-success' : 'text-destructive'}">{locFeedback.msg}</p>
  {/if}
  <div class="flex items-center gap-2">
    <Button type="button" variant="ghost" size="sm" class="h-auto p-0 text-[13px] font-semibold text-accent hover:text-accent/80" onclick={handleGetCurrentLocation} disabled={geo.locating}>
      <Crosshair class="w-3.5 h-3.5" />
      {geo.locating ? 'กำลังค้นหา…' : 'ใช้ตำแหน่งปัจจุบัน'}
    </Button>
    <span class="text-[13px] text-muted-foreground/60">หรือแตะบนแผนที่</span>
  </div>
</div>
