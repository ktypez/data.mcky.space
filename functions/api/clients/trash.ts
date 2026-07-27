import { createDb } from '../../lib/db'
import { clients, settings } from '../../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyToken, getTokenFromRequest } from '../../lib/auth'
import { json, notFound, unauthorized } from '../../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  const db = createDb(env.DB)
  const rows = await db.select().from(settings).where(sql`${settings.key} LIKE 'trash_%'`)
  const parsed: Record<string, unknown>[] = []
  for (const r of rows) {
    try { parsed.push({ ...JSON.parse(r.value), _trashKey: r.key }) } catch { }
  }
  return json(parsed.sort((a, b) => (b as any).deletedAt - (a as any).deletedAt))
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  const body = await request.json() as { id?: string }
  if (!body.id) return json({ error: 'Missing id' }, 400)

  const db = createDb(env.DB)
  const [row] = await db.select().from(settings).where(eq(settings.key, `trash_${body.id}`))
  if (!row) return notFound()

  if (action === 'restore') {
    const data = JSON.parse(row.value)
    await db.insert(clients).values(data)
    await db.delete(settings).where(eq(settings.key, `trash_${body.id}`))
    return json({ ok: true })
  }

  if (action === 'force-delete') {
    await db.delete(settings).where(eq(settings.key, `trash_${body.id}`))
    return json({ ok: true })
  }

  return json({ error: 'Invalid action' }, 400)
}
