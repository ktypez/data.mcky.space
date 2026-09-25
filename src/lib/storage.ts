import type { Client, ClientListItem } from '@/types/index'
import { responseStorage, putClient as putOfflineClient, deleteClient as deleteOfflineClient } from '@/lib/offline-db'
import { enqueueClientMutation } from '@/lib/offline-mutations'
import { useAuthStore } from '@/stores/auth-store'
import { createDataCache, DataHttpError, type DataResult } from '@/lib/data-cache'
import { clerkToken } from '@/lib/api'
import { treatyClient, treatyHeaders } from '@/lib/treaty'
import { normalizeClients, normalizeClient, coerceStringArray } from '@/lib/clientNames'

const WORKER_BASE = 'https://data-api.fall3n.workers.dev'
function offlineUserId(): string | null {
  return useAuthStore.getState().userId
}

async function queueOfflineMutation(mutation: Parameters<typeof enqueueClientMutation>[1]): Promise<boolean> {
  const userId = offlineUserId()
  if (!userId || typeof navigator !== 'undefined' && navigator.onLine) return false
  await enqueueClientMutation(userId, mutation)
  return true
}

export const PHOTO_UPLOAD_ERROR = 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'

const dataCache = createDataCache(responseStorage)
let readState = { offline: false, lastChecked: 0 }
const listeners = new Set<() => void>()
export const getDataReadState = () => readState
export const subscribeDataReadState = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function recordRead<T>(result: DataResult<T>): T {
  readState = { offline: result.offline, lastChecked: result.lastChecked }
  listeners.forEach(listener => listener())
  return result.data
}
export async function peekClientList(): Promise<ClientListItem[] | undefined> {
  const result = await dataCache.peek<ClientListItem[]>(`${WORKER_BASE}/api/clients/list`)
  if (result) return normalizeList(recordRead(result))
}
function normalizeList(data: ClientListItem[]): ClientListItem[] {
  return data.map(row => ({
    ...row,
    name: coerceStringArray(row.name),
    shopName: coerceStringArray(row.shopName),
    hasNotes: Boolean(row.hasNotes),
  }))
}

/** True if the string is a base64-embedded image data URL (too large for D1). */
function isBase64Image(s: string): boolean {
  return s.startsWith('data:image')
}

/** Strip the optional `thumb` (list-only field) before a create/update body. */
function toWriteBody(client: Client, images: string[]): Record<string, unknown> {
  const { thumb: _thumb, ...rest } = client
  void _thumb
  return { ...rest, images }
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

// Kept on XHR (not Treaty): the uploader needs `xhr.upload.onprogress`,
// which fetch cannot report. Sends the same Clerk Bearer + legacy fallback.
function xhrPost<T>(url: string, body: string, onProgress?: (pct: number) => void): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fullUrl = url.startsWith('http') ? url : `${WORKER_BASE}${url}`
    xhr.open('POST', fullUrl)
    xhr.setRequestHeader('Content-Type', 'application/json')
    // Attach only the short-lived Clerk session JWT. Do not read or send
    // legacy bearer material from localStorage; XSS could exfiltrate it.
    void clerkToken()
      .then((clerk) => {
        if (clerk) xhr.setRequestHeader('Authorization', `Bearer ${clerk}`)
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
  const data = recordRead(await dataCache.get<Record<string, unknown>[]>(`${WORKER_BASE}/api/clients`))
  return normalizeClients(data)
}

export async function fetchClientMap(): Promise<Client[]> {
  try {
    const data = recordRead(await dataCache.get<Record<string, unknown>[]>(`${WORKER_BASE}/api/clients/map`))
    return normalizeClients(data).map(client => ({ ...client, notes: null }))
  } catch (error) {
    if (error instanceof DataHttpError && error.status === 404) return fetchClients()
    throw error
  }
}

/** Revalidate every read; only an exact URL/body/ETag snapshot is reused. */
export async function fetchClientList(): Promise<ClientListItem[]> {
  return normalizeList(recordRead(await dataCache.get<ClientListItem[]>(`${WORKER_BASE}/api/clients/list`)))
}

/** Silent stale read for instant paint — returns a cached full record without
    touching global read state or the network. Null when never cached here. */
export async function peekClientById(id: string): Promise<Client | null> {
  try {
    const result = await dataCache.peek<Record<string, unknown>>(`${WORKER_BASE}/api/clients/${encodeURIComponent(id)}?raw=true`)
    if (!result) return null
    return normalizeClient(result.data)
  } catch {
    return null
  }
}

export type ClientFetchResult =
  | { status: 'found'; client: Client; offline: false }
  | { status: 'offline'; client: Client | null }
  | { status: 'not-found' }
  | { status: 'error'; error: unknown }

/** Fetch a detail record without collapsing HTTP and transport failures. */
export async function fetchClientByIdResult(id: string): Promise<ClientFetchResult> {
  try {
    const result = await dataCache.get<Record<string, unknown>>(`${WORKER_BASE}/api/clients/${encodeURIComponent(id)}?raw=true`)
    const client = normalizeClient(recordRead(result))
    return result.offline ? { status: 'offline', client } : { status: 'found', client, offline: false }
  } catch (error) {
    if (error instanceof DataHttpError && (error.status === 404 || error.status === 410)) {
      return { status: 'not-found' }
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { status: 'offline', client: null }
    }
    return { status: 'error', error }
  }
}

/** Backwards-compatible detail read for callers that only need data-or-null. */
export async function fetchClientById(id: string): Promise<Client | null> {
  const result = await fetchClientByIdResult(id)
  return result.status === 'found' || result.status === 'offline' ? result.client ?? null : null
}

export async function addClient(client: Client, onProgress?: (pct: number) => void, photoThumbs?: Record<string, string | null>): Promise<Client> {
  // Strip base64 images (too large for the POST body / D1), upload to R2
  const base64Images = client.images.filter(isBase64Image)
  const cleanImages = client.images.filter((s) => !isBase64Image(s))
  if (await queueOfflineMutation({ kind: 'create', client: { ...client, images: cleanImages } })) {
    if (base64Images.length > 0) throw new Error('รูปภาพใหม่ต้องเชื่อมต่ออินเทอร์เน็ตก่อนบันทึก')
    await putOfflineClient({ ...client, images: cleanImages })
    return { ...client, images: cleanImages }
  }

  const { data, error } = await treatyClient.api.clients.post(toWriteBody(client, cleanImages), {
    headers: await treatyHeaders(),
  })
  if (error || !data) throw new Error('Failed to add client')
  // The app-level 304 short-circuit only answers GET reads, so a POST body
  // here is always the JSON shape — the Response arm is a type-level artifact.
  const { id } = data as unknown as { ok: boolean; id: string }

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
        await treatyClient.api.clients({ id }).delete(undefined, { headers: await treatyHeaders() })
      } catch {
        // best-effort rollback
      }
      throw new Error(PHOTO_UPLOAD_ERROR)
    }
  }

  const saved: Client = { ...client, id, images: finalImages }
  await dataCache.invalidate()
  return saved
}

export async function updateClient(client: Client, onProgress?: (pct: number) => void, photoThumbs?: Record<string, string | null>): Promise<Client> {
  const base64Images = client.images.filter(isBase64Image)
  const cleanImages = client.images.filter((s) => !isBase64Image(s))

  if (await queueOfflineMutation({ kind: 'update', client: { ...client, images: cleanImages } })) {
    if (base64Images.length > 0) throw new Error('รูปภาพใหม่ต้องเชื่อมต่ออินเทอร์เน็ตก่อนบันทึก')
    await putOfflineClient({ ...client, images: cleanImages })
    return { ...client, images: cleanImages }
  }

  let finalImages = cleanImages

  // When new photos are being added, use photo-request to upload to R2
  // and also clean up any previously-stored R2 URLs the user removed.
  if (base64Images.length > 0) {
    // Fetch current state from API so we know what to delete from R2
    let prevR2Urls: string[] = []
    try {
      const { data, error } = await treatyClient.api.clients({ id: client.id }).get({ headers: await treatyHeaders() })
      if (!error && data) {
        const existing = data as unknown as Client
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
  const { error } = await treatyClient.api.clients({ id: client.id }).put(toWriteBody(client, finalImages), {
    headers: await treatyHeaders(),
  })
  if (error) throw new Error('Failed to update client')
  await dataCache.invalidate()
  return saved
}

export async function deleteClient(id: string): Promise<void> {
  if (await queueOfflineMutation({ kind: 'delete', id })) {
    await deleteOfflineClient(id)
    return
  }
  const { error } = await treatyClient.api.clients({ id }).delete(undefined, { headers: await treatyHeaders() })
  if (error) throw new Error('Failed to delete client')
  // Only remove from IDB after the server confirms the delete so a failed
  // API call can't leave the local cache out of sync.
  await dataCache.invalidate()
}
