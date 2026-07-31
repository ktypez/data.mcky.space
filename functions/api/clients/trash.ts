import { createDb } from '../../lib/db'
import { clients, settings } from '../../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyToken, getTokenFromRequest } from '../../lib/auth'
import { json, notFound, unauthorized } from '../../lib/response'
import { deleteClientImages } from '../../lib/r2'
import { logAudit, purgeOldAuditLog } from '../../lib/audit'

// M5 fix: trash keys use namespaced format `trash:v1:<id>` (was `trash_<id>`).
// The versioned namespace prevents accidental matches if future settings
// use a `trash_*` key.
const TRASH_KEY_PREFIX = 'trash:v1:'
const TRASH_TTL_DAYS = 30
const trashKey = (id: string) => `${TRASH_KEY_PREFIX}${id}`

/**
 * M1 fix: lazy cleanup. Instead of relying on a cron trigger (which
 * would require a separate Worker for Cloudflare Pages), purge
 * expired trash entries on every read of the trash list. The list is
 * admin-only and infrequent, so the overhead is negligible.
 */
async function purgeExpiredTrash(db: ReturnType<typeof createDb>): Promise<number> {
  const cutoff = Date.now() - TRASH_TTL_DAYS * 86_400_000
  const rows = await db.select().from(settings).where(sql`${settings.key} LIKE ${TRASH_KEY_PREFIX + '%'}`)
  let purged = 0
  for (const row of rows) {
    try {
      const data = JSON.parse(row.value) as { deletedAt?: number }
      if (data.deletedAt && data.deletedAt < cutoff) {
        await db.delete(settings).where(eq(settings.key, row.key))
        purged++
      }
    } catch {
      // bad JSON — leave it
    }
  }
  return purged
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const token = getTokenFromRequest(request)
  if (!token || !(await verifyToken(token, env.TOKEN_SECRET))) return unauthorized()

  const db = createDb(env.DB)
  // M1: purge expired trash entries before reading
  await purgeExpiredTrash(db)
  // Audit retention: also purge audit_log rows older than 90 days.
  // Best-effort — failure here is logged but doesn't fail the request.
  // audit_log_created_at_idx keeps the DELETE efficient.
  await purgeOldAuditLog(env)
  const rows = await db.select().from(settings).where(sql`${settings.key} LIKE ${TRASH_KEY_PREFIX + '%'}`)
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
  const [row] = await db.select().from(settings).where(eq(settings.key, trashKey(body.id)))
  if (!row) return notFound()

  if (action === 'restore') {
    const data = JSON.parse(row.value)
    await db.insert(clients).values(data)
    await db.delete(settings).where(eq(settings.key, trashKey(body.id)))
    await logAudit(env, request, { action: 'client.restore', target: body.id })
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
    await db.delete(settings).where(eq(settings.key, trashKey(body.id)))
    await logAudit(env, request, { action: 'client.force_delete', target: body.id })
    return json({ ok: true })
  }

  return json({ error: 'Invalid action' }, 400)
}
