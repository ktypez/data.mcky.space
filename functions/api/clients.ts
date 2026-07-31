import { createDb } from '../lib/db'
import { clients } from '../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyToken, getTokenFromRequest } from '../lib/auth'
import { json, error } from '../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context

  const db = createDb(env.DB)
  const url = new URL(request.url)
  const limit = url.searchParams.get('limit')

  if (limit === 'all') {
    const rows = await db.select().from(clients).orderBy(clients.updatedAt)
    return json(rows.reverse())
  }

  const numLimit = limit ? parseInt(limit, 10) : undefined
  const query = db.select().from(clients).orderBy(clients.updatedAt)
  const rows = numLimit ? await query.limit(numLimit) : await query
  return json(rows.reverse())
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }

  const data = body as Record<string, unknown>
  const name = String(data.name ?? '').trim()
  if (!name) return error('Name is required')

  const id = typeof data.id === 'string' ? data.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  const db = createDb(env.DB)

  // C3 fix: pre-flight uniqueness check gives a clean 409 before the
  // DB-level unique index raises a less-friendly error. The DB index
  // (0001_unique_client_name_lower_idx.sql) is the source of truth — this
  // check is just for a friendlier message.
  const [existing] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(sql`lower(${clients.name}) = lower(${name})`)
    .limit(1)
  if (existing) {
    return json({ error: 'Duplicate name', conflictingId: existing.id }, 409)
  }

  await db.insert(clients).values({
    id,
    name,
    shopName: String(data.shopName ?? ''),
    address: String(data.address ?? ''),
    lat: typeof data.lat === 'number' ? data.lat : null,
    lng: typeof data.lng === 'number' ? data.lng : null,
    images: Array.isArray(data.images) ? data.images : [],
    badge: typeof data.badge === 'string' ? data.badge : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  })

  return json({ ok: true, id }, 201)
}
