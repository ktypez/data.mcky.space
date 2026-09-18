import { useEffect, useState } from 'react'
import { Check, CloudArrowDown, Trash } from '@phosphor-icons/react'
import {
  getOfflineMapPackMeta,
  installOfflineMapPack,
  installOfflineMapResources,
  removeOfflineMapPack,
  resourceCacheUrl,
  type OfflineMapResource,
} from '@/lib/offline-map-pack'
import { OFFLINE_MAP_BOUNDS, OFFLINE_MAP_MAX_ZOOM, OFFLINE_MAP_MIN_ZOOM, OFFLINE_MAP_PACK_VERSION } from '@/lib/offline-map-style'

const PMTILES_URL = '/offline-maps/khon-kaen/khon-kaen.pmtiles'
type Manifest = {
  bytes: number
  sha256: string
  resources: Record<string, { bytes: number; sha256: string }>
}

async function loadManifest(): Promise<Manifest> {
  const response = await fetch('/offline-maps/khon-kaen/manifest.json', { cache: 'no-store' })
  if (!response.ok) throw new Error('โหลด manifest แผนที่ไม่สำเร็จ')
  return response.json() as Promise<Manifest>
}

function resourceDefs(manifest: Manifest): OfflineMapResource[] {
  return Object.keys(manifest.resources).map((id) => ({
    id,
    url: `/offline-maps/khon-kaen/${id}`,
    cacheUrl: resourceCacheUrl(id),
    bytes: manifest.resources[id].bytes,
    sha256: manifest.resources[id].sha256,
    contentType: id.endsWith('.json') ? 'application/json' : id.endsWith('.png') ? 'image/png' : 'application/x-protobuf',
  }))
}

export function OfflineMapControl() {
  const [installed, setInstalled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void getOfflineMapPackMeta().then((meta) => setInstalled(Boolean(meta))) }, [])
  const download = async () => {
    setBusy(true); setError(null); setProgress(0)
    try {
      const manifest = await loadManifest()
      const resources = resourceDefs(manifest)
      const response = await fetch(PMTILES_URL)
      const meta = await installOfflineMapPack(response, {
        id: 'khon-kaen', version: OFFLINE_MAP_PACK_VERSION, bounds: OFFLINE_MAP_BOUNDS,
        minZoom: OFFLINE_MAP_MIN_ZOOM, maxZoom: OFFLINE_MAP_MAX_ZOOM, styleUrl: 'local://khon-kaen/style',
        styleBytes: 0, glyphsBytes: 0, spritesBytes: 0, sha256: manifest.sha256, resources,
      }, (loaded, total) => setProgress(total ? Math.round((loaded / total) * 80) : 1))
      await installOfflineMapResources(resources, (done, total) => setProgress(80 + Math.round((done / total) * 20)))
      setInstalled(Boolean(meta)); setProgress(100)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ดาวน์โหลดแผนที่ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  const remove = async () => { setBusy(true); setError(null); try { await removeOfflineMapPack(); setInstalled(false) } catch (cause) { setError(cause instanceof Error ? cause.message : 'ลบแผนที่ไม่สำเร็จ') } finally { setBusy(false) } }
  return <section className="rounded-xl border border-border bg-card p-4 text-sm">
    <div className="flex items-center justify-between gap-3">
      <div><strong>แผนที่ออฟไลน์ขอนแก่น</strong><div className="text-xs text-muted-foreground">17 MB · zoom {OFFLINE_MAP_MIN_ZOOM}–{OFFLINE_MAP_MAX_ZOOM}</div></div>
      {installed ? <Check className="text-green-600" weight="bold" /> : <CloudArrowDown className="text-muted-foreground" />}
    </div>
    {busy && <progress className="mt-3 h-2 w-full" value={progress} max="100" />}
    {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    <div className="mt-3 flex gap-2">
      {!installed ? <button disabled={busy} onClick={() => void download()} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50">{busy ? `กำลังดาวน์โหลด ${progress}%` : 'ดาวน์โหลด'}</button> : <button disabled={busy} onClick={() => void remove()} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 disabled:opacity-50"><Trash size={14} /> ลบแผนที่</button>}
    </div>
  </section>
}
