import type { Client } from '@/types'
import { getAllClients, putClient, putClients, deleteClient as deleteClientFromDb } from '@/lib/offline-db'
import { apiFetch } from '@/lib/api'

function toRaw(c: Client): Record<string, unknown> {
  return c as unknown as Record<string, unknown>
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
): Promise<{ ok: true; images: string[] } | { ok: false }> {
  if (base64Images.length === 0 && deletedImages.length === 0) {
    return { ok: true, images: [] }
  }
  try {
    const res = await apiFetch('/api/photo-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, images: base64Images, deletedImages }),
    })
    if (res.ok) {
      const data = (await res.json()) as { images: string[] }
      return { ok: true, images: data.images }
    }
  } catch (e) {
    console.warn('Failed to upload images to R2', e)
  }
  return { ok: false }
}

export async function fetchClients(limit?: number): Promise<Client[]> {
  let url: string
  if (limit === 0) {
    url = '/api/clients?limit=all'
  } else if (limit) {
    url = `/api/clients?limit=${limit}`
  } else {
    url = '/api/clients'
  }
  const res = await apiFetch(url)
  if (!res.ok) {
    const idb = await getAllClients()
    if (idb.length > 0) return idb as unknown as Client[]
    throw new Error('Failed to fetch clients')
  }
  const fresh = (await res.json()) as Client[]
  await putClients(fresh.map(toRaw))
  return fresh
}

export async function addClient(client: Client): Promise<Client> {
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
    const result = await uploadBase64Images(id, base64Images, [])
    if (result.ok) {
      // Keep only R2 URLs — strip any base64 that may have been in D1
      finalImages = result.images.filter((s) => !isBase64Image(s))
    }
    // result.ok === false → skip photos so entry still saves
  }

  const saved: Client = { ...client, id, images: finalImages }
  await putClient(toRaw(saved))
  return saved
}

export async function updateClient(client: Client): Promise<Client> {
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
    const result = await uploadBase64Images(client.id, base64Images, deletedImages)
    if (result.ok) {
      // Keep only R2 URLs — strip any base64 that may have been in D1
      finalImages = result.images.filter((s) => !isBase64Image(s))
    }
    // result.ok === false → keep cleanImages (old R2 URLs), entry still saves
  }

  // Persist to IndexedDB
  const saved = { ...client, images: finalImages }
  await putClient(toRaw(saved))

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
      return data as Client
    }
  } catch {
    // ignore non-JSON / { ok: true } responses — fall back to input client
  }
  return saved
}

export async function deleteClient(id: string): Promise<void> {
  await deleteClientFromDb(id)
  const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete client')
}
