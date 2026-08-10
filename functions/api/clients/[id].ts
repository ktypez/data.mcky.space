import { createDb } from '../../lib/db'
import { clients, settings } from '../../lib/schema'
import { eq } from 'drizzle-orm'
import { json, error, notFound, unauthorized } from '../../lib/response'
import { logAudit } from '../../lib/audit'
import { roundLatLng } from '../../lib/geo'
import { verifyTokenFromRequest } from '../../lib/auth'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, params, request } = context
  const db = createDb(env.DB)
  const [row] = await db.select().from(clients).where(eq(clients.id, params.id))
  if (!row) return notFound()
  // L2 fix: round lat/lng on single GET too. 5-decimal precision (~11m)
  // is enough for the map picker; full precision was a PII leak vector
  // for any future public detail page. If admin needs exact coords
  // for some reason, they can be added back via a `?raw=true` query
  // param later.
  const url = new URL(request.url)
  if (url.searchParams.get('raw') === 'true') return json(row)
  return json(roundLatLng(row))
}

export async function onRequestPut(context: EventContext<Env, any, any>) {
  const { env, request, params } = context
  const db = createDb(env.DB)
  if (!(await verifyTokenFromRequest(request, env, db))) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }
  const data = body as Record<string, unknown>

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
  const db = createDb(env.DB)
  if (!(await verifyTokenFromRequest(request, env, db))) return unauthorized()

  const [row] = await db.select().from(clients).where(eq(clients.id, params.id))
  if (!row) return notFound()

  // Soft delete only — R2 photos are preserved so the client can be
  // restored with intact images. R2 cleanup happens on force-delete.
  // (C1 fix: previously R2 was deleted here, breaking restore.)
  // M5 fix: use namespaced key `trash:v1:<id>` (was `trash_<id>`).
  const clientData = JSON.stringify({ ...row, deletedAt: Date.now() })

  await db.insert(settings).values({ key: `trash:v1:${params.id}`, value: clientData }).onConflictDoNothing()
  await db.delete(clients).where(eq(clients.id, params.id))

  await logAudit(env, request, { action: 'client.delete', target: params.id })
  return json({ ok: true })
}
