import { createDb } from '../lib/db'
import { suggestions, clients } from '../lib/schema'
import { eq } from 'drizzle-orm'
import { json, error } from '../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  const db = createDb(env.DATABASE_URL)

  if (mode === 'pending-client-ids') {
    const rows = await db
      .select({ clientId: suggestions.clientId })
      .from(suggestions)
      .where(eq(suggestions.status, 'pending'))
    return json(rows.map((r) => r.clientId))
  }

  const status = url.searchParams.get('status')
  const clientId = url.searchParams.get('clientId')

  let query = db.select().from(suggestions)
  const filters = []
  if (status && status !== 'all') filters.push(eq(suggestions.status, status))
  if (clientId) filters.push(eq(suggestions.clientId, clientId))

  if (filters.length > 0) {
    // @ts-expect-error drizzle variadic where
    query = query.where(...filters)
  }

  const rows = await query.orderBy(suggestions.createdAt)
  return json(rows.reverse())
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  let body: unknown
  try { body = await request.json() } catch { return error('Invalid request') }
  const { clientId, suggested, original } = body as Record<string, unknown>

  if (typeof clientId !== 'string') return error('Invalid request')

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const now = Date.now()
  const db = createDb(env.DATABASE_URL)
  await db.insert(suggestions).values({
    id,
    clientId,
    suggested: suggested as any,
    original: original as any,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  })

  return json({
    id,
    clientId,
    suggested,
    original,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }, 201)
}
