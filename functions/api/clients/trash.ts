import { createDb } from '../../lib/db'
import { clients, settings } from '../../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyToken, getTokenFromRequest } from '../../lib/auth'
import { json, notFound, unauthorized } from '../../lib/response'
import { deleteClientImages } from '../../lib/r2'

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
    // C1 fix: R2 photos were previously deleted in DELETE handler, breaking
    // restore. Now they're preserved until force-delete actually purges them.
    try {
      const snapshot = JSON.parse(row.value) as { images?: unknown }
      if (Array.isArray(snapshot.images) && snapshot.images.length > 0) {
        await deleteClientImages(env.BUCKET, env.R2_PUBLIC_URL, snapshot.images as string[])
      }
    } catch {
      // Snapshot parse failed — still drop the setting row to free space
    }
    await db.delete(settings).where(eq(settings.key, `trash_${body.id}`))
    return json({ ok: true })
  }

  return json({ error: 'Invalid action' }, 400)
}
