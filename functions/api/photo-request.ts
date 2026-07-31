import { createDb } from '../lib/db'
import { clients } from '../lib/schema'
import { eq } from 'drizzle-orm'
import { uploadClientImages, deleteClientImages } from '../lib/r2'
import { verifyToken, getTokenFromRequest } from '../lib/auth'
import { json, error, unauthorized } from '../lib/response'

// M6 fix: per-image size cap on base64 payloads accepted by this endpoint.
// The client compresses to ~0.5MB; we allow some headroom for non-compressed
// uploads (e.g. SVG, GIF) while preventing accidental megabyte blowups.
const MAX_BASE64_BYTES_PER_IMAGE = 5 * 1024 * 1024

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }
  const { clientId, images, deletedImages } = body as Record<string, unknown>

  if (typeof clientId !== 'string' || !Array.isArray(images)) return error('Invalid request')

  // M6 fix: server-side size check. Reject any base64 image larger than
  // the cap before we even attempt to upload. Prevents bandwidth/storage
  // blowup if the client bypasses local compression.
  for (const img of images as string[]) {
    if (img.startsWith('data:image') && img.length > MAX_BASE64_BYTES_PER_IMAGE) {
      return json(
        { error: 'Image too large', maxBytes: MAX_BASE64_BYTES_PER_IMAGE },
        413,
      )
    }
  }

  const db = createDb(env.DB)
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  if (!client) return error('Client not found', 404)

  // Delete removed images if provided
  if (Array.isArray(deletedImages) && deletedImages.length > 0) {
    await deleteClientImages(env.BUCKET, env.R2_PUBLIC_URL, deletedImages as string[])
  }

  // Upload new images. C2 fix: uploadClientImages now throws on any failure
  // (previously Promise.allSettled silently swallowed errors and returned
  // base64 strings, which then leaked into D1).
  let newUrls: string[]
  try {
    newUrls = await uploadClientImages(env.BUCKET, env.R2_PUBLIC_URL, clientId, images as string[])
  } catch (e) {
    return json(
      { error: 'Photo upload failed', detail: e instanceof Error ? e.message : String(e) },
      502,
    )
  }

  // Merge images: keep existing images that weren't deleted, add new ones.
  // All entries in `newUrls` are R2 URLs (or already-R2 URLs passed through),
  // so no base64 filter is needed.
  const existing = Array.isArray(client.images) ? (client.images as string[]) : []
  const kept = Array.isArray(deletedImages)
    ? existing.filter((url) => !(deletedImages as string[]).includes(url))
    : existing
  const merged = [...kept, ...newUrls]

  await db.update(clients).set({ images: merged, updatedAt: Date.now() }).where(eq(clients.id, clientId))
  return json({ images: merged })
}
