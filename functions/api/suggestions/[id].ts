import { createDb } from '../../lib/db'
import { suggestions, clients } from '../../lib/schema'
import { eq } from 'drizzle-orm'
import { verifyToken, getTokenFromRequest } from '../../lib/auth'
import { json, error, unauthorized } from '../../lib/response'
import { uploadClientImages } from '../../lib/r2'

export async function onRequestPut(context: EventContext<Env, any, any>) {
  const { env, request, params } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }
  const { action } = body as Record<string, unknown>

  if (action !== 'approve' && action !== 'reject') return error('Invalid action')

  const db = createDb(env.DB)
  const [row] = await db.select().from(suggestions).where(eq(suggestions.id, params.id))
  if (!row || row.status !== 'pending') return error('Suggestion not found or already processed', 404)

  const now = Date.now()

  if (action === 'approve') {
    const suggested = row.suggested as Record<string, unknown>
    const update: Record<string, unknown> = {
      name: suggested.name as string,
      shopName: suggested.shopName as string,
      address: suggested.address as string,
      lat: suggested.lat as number | null,
      lng: suggested.lng as number | null,
      updatedAt: now,
    }

    // Upload photo if this is a photo suggestion
    if (row.suggestedPhoto) {
      const newUrls = await uploadClientImages(env.BUCKET, env.R2_PUBLIC_URL, row.clientId, [row.suggestedPhoto])
      if (newUrls.length > 0 && newUrls[0].startsWith('http')) {
        // Get current images and append new one
        const [client] = await db.select().from(clients).where(eq(clients.id, row.clientId))
        const currentImages = (client?.images as string[]) || []
        update.images = [...currentImages, newUrls[0]]
      }
    }

    await db.update(clients).set(update).where(eq(clients.id, row.clientId))
  }

  // Clear suggestedPhoto after processing
  await db.update(suggestions).set({
    status: action === 'approve' ? 'approved' : 'rejected',
    suggestedPhoto: null,
    updatedAt: now,
  }).where(eq(suggestions.id, params.id))

  return json({ ok: true })
}
