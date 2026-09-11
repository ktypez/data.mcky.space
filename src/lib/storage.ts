import type { Client, ClientListItem } from '@/types/index'
import { getAllClients, putClient, putClients, deleteClient as deleteClientFromDb } from '@/lib/offline-db'
import { apiFetch, clerkToken } from '@/lib/api'
import { normalizeClients, normalizeClient } from '@/lib/clientNames'

const WORKER_BASE = 'https://data-api.fall3n.workers.dev'
export const PHOTO_UPLOAD_ERROR = 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'

function toRaw(c: Client): Record<string, unknown> {
  return c as unknown as Record<string, unknown>
}

/**
 * IDB caches can hold either the new array format or legacy plain-string
 * name/shopName (cached before the multi-name deploy). Normalize on read so
 * consumers always get `string[]`.
 */
function normalizeFromIdb(rows: Record<string, unknown>[]): Client[] {
  return normalizeClients(rows)
}

/** True if the string is a base64-embedded image data URL (too large for D1). */
function isBase64Image(s: string): boolean {
  return s.startsWith('data:image')
}

/**
 * Upload base64 images to R2 via /api/photo-request, then return the merged
 * image list (existing R2 URLs + new R2 URLs).
 * Returns { ok: true, images } on success, or { ok: false } on failure
 * so the caller can decide whether to proceed without the new photos.
 */
async function uploadBase64Images(
  clientId: string,
  base64Images: string[],
  deletedImages: string[],
  onProgress?: (pct: number) => void,
  thumbs?: (string | null)[],
): Promise<{ ok: true; images: string[] } | { ok: false }> {
  if (base64Images.length === 0 && deletedImages.length === 0) {
    return { ok: true, images: [] }
  }
  try {
    const payload = JSON.stringify({ clientId, images: base64Images, deletedImages, thumbs: thumbs ?? base64Images.map(() => null) })
    const data = await xhrPost<{ images: string[] }>('/api/photo-request', payload, onProgress)
    if (data) return { ok: true, images: data.images }
  } catch (e) {
    console.warn('Failed to upload images to R2:', e)
  }
  return { ok: false }
}

function xhrPost<T>(url: string, body: string, onProgress?: (pct: number) => void): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fullUrl = url.startsWith('http') ? url : `${WORKER_BASE}${url}`
    xhr.open('POST', fullUrl)
    xhr.setRequestHeader('Content-Type', 'application/json')
    // Clerk migration fix: photo uploads used to send only the legacy HMAC
    // token, which is never written to localStorage anymore — so every new
    // admin session got a silent 401 and photos were dropped. Attach the
    // Clerk session JWT as the primary auth, keep the legacy header as a
    // transitional fallback for sessions that predate the migration.
    void clerkToken()
      .then((clerk) => {
        if (clerk) xhr.setRequestHeader('Authorization', `Bearer ${clerk}`)
        const legacy = localStorage.getItem('ezzylist_admin_token')
        if (legacy) xhr.setRequestHeader('x-admin-token', legacy)
        xhr.send(body)
      })
      .catch(() => xhr.send(body))
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as T) } catch { resolve(null) }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
  })
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const res = await apiFetch('/api/clients')
    if (!res.ok) throw new Error('Failed to fetch clients')
    const fresh = (await res.json()) as Client[]
    await putClients(fresh.map(toRaw))
    return fresh
  } catch {
    const idb = await getAllClients()
    if (idb.length > 0) return normalizeFromIdb(idb)
    throw new Error('Failed to fetch clients')
  }
}

/**
 * Lightweight list endpoint — returns only the fields the catalog needs.
 * Significantly smaller payload than the full /api/clients endpoint.
 * Response is cached at the Cloudflare edge for 60 seconds.
 *
 * Client-side stale-while-revalidate: if a fresh copy was fetched within the
 * last 60s, its Promise is reused so rapid re-mounts (tab switches, store
 * resets) don't re-hit the network. After 60s the next call refetches.
 */
let listCache: { at: number; data: ClientListItem[] } | null = null
const LIST_CACHE_TTL = 60_000
export async function fetchClientList(): Promise<ClientListItem[]> {
  if (listCache && Date.now() - listCache.at < LIST_CACHE_TTL) return listCache.data
  const res = await apiFetch('/api/clients/list')
  if (!res.ok) throw new Error('Failed to fetch client list')
  const data = (await res.json()) as ClientListItem[]
  listCache = { at: Date.now(), data }
  return data
}

/**
 * Fetch a single client's full data. Used by the detail page when the
 * store only has lightweight list data.
 */
export async function fetchClientById(id: string): Promise<Client | null> {
  try {
    const res = await apiFetch(`/api/clients/${id}?raw=true`)
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    return normalizeClient(data) as Client
  } catch {
    return null
  }
}

export async function addClient(client: Client, onProgress?: (pct: number) => void, photoThumbs?: Record<string, string | null>): Promise<Client> {
  // Strip base64 images (too large for the POST body / D1), upload to R2
  const base64Images = client.images.filter(isBase64Image)
  const cleanImages = client.images.filter((s) => !isBase64Image(s))

  const res = await apiFetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...client, images: cleanImages }),
  })
  if (!res.ok) throw new Error('Failed to add client')
  const { id } = (await res.json()) as { id: string }

  // Upload photos to R2 now that we have a real clientId
  let finalImages = cleanImages
  if (base64Images.length > 0) {
    const thumbs = base64Images.map((u) => photoThumbs?.[u] ?? null)
    const result = await uploadBase64Images(id, base64Images, [], onProgress, thumbs)
    if (result.ok) {
      // Keep only R2 URLs — strip any base64 that may have been in D1
      finalImages = result.images.filter((s) => !isBase64Image(s))
    } else {
      // Photo upload failed — roll back the just-created client so the
      // entry can't be saved without its photos, and let the caller
      // surface the error instead of failing silently.
      try {
        await apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
      } catch {
        // best-effort rollback
      }
      throw new Error(PHOTO_UPLOAD_ERROR)
    }
  }

  const saved: Client = { ...client, id, images: finalImages }
  await putClient(toRaw(saved))
  return saved
}

export async function updateClient(client: Client, onProgress?: (pct: number) => void, photoThumbs?: Record<string, string | null>): Promise<Client> {
  const base64Images = client.images.filter(isBase64Image)
  const cleanImages = client.images.filter((s) => !isBase64Image(s))

  let finalImages = cleanImages

  // When new photos are being added, use photo-request to upload to R2
  // and also clean up any previously-stored R2 URLs the user removed.
  if (base64Images.length > 0) {
    // Fetch current state from API so we know what to delete from R2
    let prevR2Urls: string[] = []
    try {
      const prevRes = await apiFetch(`/api/clients/${client.id}`)
      if (prevRes.ok) {
        const existing = (await prevRes.json()) as Client
        prevR2Urls = (existing.images || []).filter((s) => !isBase64Image(s))
      }
    } catch {
      // non-critical — we can still upload, just won't clean up removed ones
    }
    const deletedImages = prevR2Urls.filter((url) => !cleanImages.includes(url))
    const thumbs = base64Images.map((u) => photoThumbs?.[u] ?? null)
    const result = await uploadBase64Images(client.id, base64Images, deletedImages, onProgress, thumbs)
    if (result.ok) {
      // Keep only R2 URLs — strip any base64 that may have been in D1
      finalImages = result.images.filter((s) => !isBase64Image(s))
    } else {
      // Photo upload failed — abort the update so the client can't be
      // overwritten without its new photos. Nothing has been persisted yet
      // (upload happens before putClient / the D1 PUT).
      throw new Error(PHOTO_UPLOAD_ERROR)
    }
  }

  // Persist to IndexedDB only after the API call succeeds so the cache
  // never diverges from the server. If the API fails the caller will
  // surface the error and the user can retry without stale local data.
  const saved = { ...client, images: finalImages }

  // Update D1 — payload is now small (only R2 URLs, no base64)
  const res = await apiFetch(`/api/clients/${client.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...client, images: finalImages }),
  })
  if (!res.ok) throw new Error('Failed to update client')
  try {
    const data = (await res.json()) as Partial<Client> | { ok: boolean }
    if (data && typeof data === 'object' && 'id' in data && (data as Client).id) {
      await putClient(toRaw(data as Client))
      return data as Client
    }
  } catch {
    // ignore non-JSON / { ok: true } responses — fall back to input client
  }
  await putClient(toRaw(saved))
  return saved
}

export async function deleteClient(id: string): Promise<void> {
  const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete client')
  // Only remove from IDB after the server confirms the delete so a failed
  // API call can't leave the local cache out of sync.
  await deleteClientFromDb(id)
}
