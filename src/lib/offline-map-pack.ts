export const MAP_PACK_CACHE = 'ezzy-map-packs-v2'
export const MAP_PACK_ID = 'khon-kaen'
export const MAP_PACK_URL = `/offline-maps/${MAP_PACK_ID}.pmtiles`
export const MAP_PACK_MAX_BYTES = 250 * 1024 * 1024
const RESOURCE_PREFIX = `/offline-map-resources/${MAP_PACK_ID}/`

export interface OfflineMapResource {
  id: string
  url: string
  cacheUrl: string
  bytes: number
  sha256?: string
  contentType: string
}

export interface OfflineMapPackMeta {
  id: string
  version: string
  bytes: number
  installedAt: number
  bounds: [number, number, number, number]
  minZoom: number
  maxZoom: number
  styleUrl: string
  styleBytes: number
  glyphsBytes: number
  spritesBytes: number
  resources: OfflineMapResource[]
  sha256?: string
}

const DB_NAME = 'ezzy-offline-map-packs'
const DB_VERSION = 1
const STORE = 'packs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Cannot open map-pack database'))
  })
}

async function putMeta(meta: OfflineMapPackMeta): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(meta)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Cannot save map-pack metadata'))
  })
  db.close()
}

export async function getOfflineMapPackMeta(id = MAP_PACK_ID): Promise<OfflineMapPackMeta | null> {
  const db = await openDb()
  const meta = await new Promise<OfflineMapPackMeta | undefined>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return meta ?? null
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function readResponse(response: Response, maxBytes = MAP_PACK_MAX_BYTES, onProgress?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  if (!response.ok || !response.body) throw new Error(`Map-pack download failed: ${response.status}`)
  const total = Number(response.headers.get('content-length') ?? 0)
  if (total > maxBytes) throw new Error('Map-pack is too large')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    loaded += part.value.byteLength
    if (loaded > maxBytes) throw new Error('Map-pack is too large')
    chunks.push(part.value)
    onProgress?.(loaded, total)
  }
  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  if (!bytes.byteLength) throw new Error('Map-pack is empty')
  return bytes.buffer
}

export async function installOfflineMapPack(
  response: Response,
  meta: Omit<OfflineMapPackMeta, 'bytes' | 'installedAt' | 'resources'> & { resources?: OfflineMapResource[] },
  onProgress?: (loaded: number, total: number) => void,
): Promise<OfflineMapPackMeta> {
  const bytes = await readResponse(response, MAP_PACK_MAX_BYTES, onProgress)
  const digest = await sha256(bytes)
  if (meta.sha256 && meta.sha256 !== digest) throw new Error('Map-pack checksum mismatch')
  const installed: OfflineMapPackMeta = { ...meta, resources: meta.resources ?? [], bytes: bytes.byteLength, installedAt: Date.now(), sha256: digest }
  const cache = await caches.open(MAP_PACK_CACHE)
  await cache.put(MAP_PACK_URL, new Response(bytes, { headers: { 'Content-Type': 'application/vnd.pmtiles', 'Content-Length': String(bytes.byteLength) } }))
  try { await putMeta(installed) } catch (error) { await cache.delete(MAP_PACK_URL); throw error }
  return installed
}

export async function installOfflineMapResources(resources: OfflineMapResource[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const cache = await caches.open(MAP_PACK_CACHE)
  let done = 0
  try {
    for (const resource of resources) {
      const response = await fetch(resource.url)
      const bytes = await readResponse(response, MAP_PACK_MAX_BYTES)
      if (resource.bytes && bytes.byteLength !== resource.bytes) throw new Error(`Resource size mismatch: ${resource.id}`)
      if (resource.sha256 && await sha256(bytes) !== resource.sha256) throw new Error(`Resource checksum mismatch: ${resource.id}`)
      await cache.put(resource.cacheUrl, new Response(bytes, { headers: { 'Content-Type': resource.contentType } }))
      onProgress?.(++done, resources.length)
    }
  } catch (error) {
    for (const resource of resources) await cache.delete(resource.cacheUrl)
    throw error
  }
}

export async function getOfflineMapResource(id: string): Promise<Response | undefined> {
  const cache = await caches.open(MAP_PACK_CACHE)
  return cache.match(`${RESOURCE_PREFIX}${id}`)
}

export function resourceCacheUrl(id: string): string { return `${RESOURCE_PREFIX}${id}` }

export async function openOfflineMapPack(id = MAP_PACK_ID): Promise<Blob | null> {
  if (id !== MAP_PACK_ID || !(await getOfflineMapPackMeta(id))) return null
  const cache = await caches.open(MAP_PACK_CACHE)
  const response = await cache.match(MAP_PACK_URL)
  return response ? response.blob() : null
}

export async function removeOfflineMapPack(id = MAP_PACK_ID): Promise<void> {
  if (id !== MAP_PACK_ID) return
  const cache = await caches.open(MAP_PACK_CACHE)
  const meta = await getOfflineMapPackMeta(id)
  await cache.delete(MAP_PACK_URL)
  for (const resource of meta?.resources ?? []) await cache.delete(resource.cacheUrl)
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error('Cannot remove map-pack metadata'))
  })
  db.close()
}
