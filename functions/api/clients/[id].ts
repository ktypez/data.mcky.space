import { createDb } from '../../lib/db'
import { clients, settings } from '../../lib/schema'
import { eq } from 'drizzle-orm'
import { json, error, notFound, unauthorized } from '../../lib/response'
import { logAudit } from '../../lib/audit'

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

  await logAudit(env, request, { action: 'client.update', target: params.id })
  return json({ ok: true })
}

export async function onRequestDelete(context: EventContext<Env, any, any>) {
  const { env, request, params } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  const db = createDb(env.DB)
  const [row] = await db.select().from(clients).where(eq(clients.id, params.id))
  if (!row) return notFound()

  // Soft delete only — R2 photos are preserved so the client can be
  // restored with intact images. R2 cleanup happens on force-delete.
  // (C1 fix: previously R2 was deleted here, breaking restore.)
  // M5 fix: use namespaced key `trash:v1:<id>` (was `trash_<id>`).
  const data = JSON.stringify({ ...row, deletedAt: Date.now() })
  await db.insert(settings).values({ key: `trash:v1:${params.id}`, value: data }).onConflictDoNothing()
  await db.delete(clients).where(eq(clients.id, params.id))

  await logAudit(env, request, { action: 'client.delete', target: params.id })
  return json({ ok: true })
}
