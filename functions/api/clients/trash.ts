import { createDb } from '../../lib/db'
import { clients, settings } from '../../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyTokenFromRequest } from '../../lib/auth'
import { json, notFound, unauthorized } from '../../lib/response'
import { deleteClientImages } from '../../lib/r2'
import { logAudit, purgeOldAuditLog } from '../../lib/audit'
import { normalizeClient } from '../../lib/names'

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
  const db = createDb(env.DB)
  if (!(await verifyTokenFromRequest(request, env, db))) return unauthorized()

  // M1: purge expired trash entries before reading
  await purgeExpiredTrash(db)
  // Audit retention: also purge audit_log rows older than 90 days.
  // Best-effort — failure here is logged but doesn't fail the request.
  // audit_log_created_at_idx keeps the DELETE efficient.
  await purgeOldAuditLog(env)
  // Filter to only `trash:v1:<id>` (the client snapshot).
  const rows = await db
    .select()
    .from(settings)
    .where(sql`${settings.key} LIKE ${TRASH_KEY_PREFIX + '%'}`)
  const parsed: Record<string, unknown>[] = []
  for (const r of rows) {
    try {
      // Trash snapshots store the raw DB row (name/shopName as TEXT), so
      // normalize them to arrays before sending to the client.
      parsed.push({ ...normalizeClient(JSON.parse(r.value)), _trashKey: r.key })
    } catch { }
  }
  return json(parsed.sort((a, b) => (b as any).deletedAt - (a as any).deletedAt))
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const db = createDb(env.DB)
  if (!(await verifyTokenFromRequest(request, env, db))) return unauthorized()

  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  let body: { id?: string }
  try {
    body = await request.json() as { id?: string }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.id) return json({ error: 'Missing id' }, 400)

  const [row] = await db.select().from(settings).where(eq(settings.key, trashKey(body.id)))
  if (!row) return notFound()

  if (action === 'restore') {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(row.value)
    } catch {
      return json({ error: 'Corrupted trash data' }, 422)
    }
    // Strip the deletedAt marker before re-inserting
    const { deletedAt: _deletedAt, ...clientRow } = data as Record<string, unknown> & { deletedAt?: number }
    void _deletedAt
    await db.insert(clients).values(clientRow)

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
