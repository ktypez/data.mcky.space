import { createDb } from '../../lib/db'
import { clients, settings } from '../../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyToken, getTokenFromRequest } from '../../lib/auth'
import { json, error, notFound, unauthorized } from '../../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, params } = context
  const db = createDb(env.DB)
  const [row] = await db.select().from(clients).where(eq(clients.id, params.id))
  if (!row) return notFound()
  return json(row)
}

export async function onRequestPut(context: EventContext<Env, any, any>) {
  const { env, request, params } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }
  const data = body as Record<string, unknown>

  const db = createDb(env.DB)
  await db.update(clients).set({
    name: String(data.name ?? ''),
    shopName: String(data.shopName ?? ''),
    address: String(data.address ?? ''),
    lat: typeof data.lat === 'number' ? data.lat : null,
    lng: typeof data.lng === 'number' ? data.lng : null,
    images: Array.isArray(data.images) ? data.images : [],
    badge: typeof data.badge === 'string' ? data.badge : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
    updatedAt: Date.now(),
  }).where(eq(clients.id, params.id))

  return json({ ok: true })
}

export async function onRequestDelete(context: EventContext<Env, any, any>) {
  const { env, request, params } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  const db = createDb(env.DB)
  const [row] = await db.select().from(clients).where(eq(clients.id, params.id))
  if (!row) return notFound()

  const data = JSON.stringify({ ...row, deletedAt: Date.now() })
  await db.insert(settings).values({ key: `trash_${params.id}`, value: data }).onConflictDoNothing()
  await db.delete(clients).where(eq(clients.id, params.id))

  return json({ ok: true })
}
