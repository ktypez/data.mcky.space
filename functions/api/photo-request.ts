import { createDb } from '../lib/db'
import { clients } from '../lib/schema'
import { eq } from 'drizzle-orm'
import { uploadClientImages, deleteClientImages } from '../lib/r2'
import { verifyToken, getTokenFromRequest } from '../lib/auth'
import { json, error, unauthorized } from '../lib/response'

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }
  const { clientId, images, deletedImages } = body as Record<string, unknown>

  if (typeof clientId !== 'string' || !Array.isArray(images)) return error('Invalid request')

  const db = createDb(env.DB)
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  if (!client) return error('Client not found', 404)

  // Delete removed images if provided
  if (Array.isArray(deletedImages) && deletedImages.length > 0) {
    await deleteClientImages(env.BUCKET, env.R2_PUBLIC_URL, deletedImages as string[])
  }

  // Upload new images
  const newUrls = await uploadClientImages(env.BUCKET, env.R2_PUBLIC_URL, clientId, images as string[])

  // Merge images: keep existing images that weren't deleted, add new ones
  const existing = Array.isArray(client.images) ? (client.images as string[]) : []
  const kept = Array.isArray(deletedImages)
    ? existing.filter((url) => !(deletedImages as string[]).includes(url))
    : existing
  const merged = [...kept, ...newUrls]

  await db.update(clients).set({ images: merged, updatedAt: Date.now() }).where(eq(clients.id, clientId))
  return json({ images: merged })
}
