import { createDb } from '../../lib/db'
import { suggestions, clients } from '../../lib/schema'
import { eq } from 'drizzle-orm'
import { verifyToken, getTokenFromRequest } from '../../lib/auth'
import { json, error, unauthorized } from '../../lib/response'

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request, params } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }
  const { action } = body as Record<string, unknown>

  if (action !== 'approve' && action !== 'reject') return error('Invalid action')

  const db = createDb(env.DATABASE_URL)
  const [row] = await db.select().from(suggestions).where(eq(suggestions.id, params.id))
  if (!row || row.status !== 'pending') return error('Suggestion not found or already processed', 404)

  const now = Date.now()

  if (action === 'approve') {
    const suggested = row.suggested as Record<string, unknown>
    await db.update(clients).set({
      name: suggested.name as string,
      shopName: suggested.shopName as string,
      address: suggested.address as string,
      lat: suggested.lat as number | null,
      lng: suggested.lng as number | null,
      updatedAt: now,
    }).where(eq(clients.id, row.clientId))
  }

  await db.update(suggestions).set({
    status: action === 'approve' ? 'approved' : 'rejected',
    updatedAt: now,
  }).where(eq(suggestions.id, params.id))

  return json({ ok: true })
}
