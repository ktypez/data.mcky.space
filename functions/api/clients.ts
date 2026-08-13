import { createDb } from '../lib/db'
import { clients } from '../lib/schema'
import { desc } from 'drizzle-orm'
import { verifyTokenFromRequest } from '../lib/auth'
import { json, error } from '../lib/response'
import { roundLatLngList } from '../lib/geo'
import { logAudit } from '../lib/audit'
import { normalizeClientList, serializeNames } from '../lib/names'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context

  const db = createDb(env.DB)
  const url = new URL(request.url)
  const limit = url.searchParams.get('limit')

  // Order newest-first by updatedAt directly (no ASC + reverse hack — that
  // used to make ?limit=N return the N OLDEST clients).
  if (limit === 'all') {
    const rows = await db.select().from(clients).orderBy(desc(clients.updatedAt))
    // L2 fix: round lat/lng to ~11m precision in list responses
    return json(roundLatLngList(normalizeClientList(rows)))
  }

  const numLimit = limit ? parseInt(limit, 10) : undefined
  const query = db.select().from(clients).orderBy(desc(clients.updatedAt))
  const rows = numLimit ? await query.limit(numLimit) : await query
  return json(roundLatLngList(normalizeClientList(rows)))
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const db = createDb(env.DB)
  if (!(await verifyTokenFromRequest(request, env, db))) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }

  const data = body as Record<string, unknown>
  const id = typeof data.id === 'string' ? data.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const now = Date.now()

  await db.insert(clients).values({
    id,
    name: serializeNames(data.name),
    shopName: serializeNames(data.shopName),
    address: String(data.address ?? ''),
    lat: typeof data.lat === 'number' ? data.lat : null,
    lng: typeof data.lng === 'number' ? data.lng : null,
    images: Array.isArray(data.images) ? data.images : [],
    badge: typeof data.badge === 'string' ? data.badge : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
    // L4 fix: server always owns createdAt/updatedAt. Ignore any
    // client-supplied values to prevent historical-date spoofing.
    createdAt: now,
    updatedAt: now,
  })

  await logAudit(env, request, { action: 'client.create', target: id, payload: { name: String(data.name ?? '') } })
  return json({ ok: true, id }, 201)
}
