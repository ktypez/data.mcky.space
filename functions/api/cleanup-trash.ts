import { createDb } from '../lib/db'
import { settings } from '../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { verifyTokenFromRequest } from '../lib/auth'
import { json, unauthorized } from '../lib/response'

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const db = createDb(context.env.DB)
  if (!(await verifyTokenFromRequest(context.request, context.env, db))) return unauthorized()

  const days = 30
  const cutoff = Date.now() - days * 86_400_000
  // M5 fix: use namespaced `trash:v1:` prefix instead of `trash_`.
  const rows = await db.select().from(settings).where(sql`${settings.key} LIKE 'trash:v1:%'`)
  let count = 0
  for (const row of rows) {
    try {
      const data = JSON.parse(row.value) as { deletedAt?: number }
      if (data.deletedAt && data.deletedAt < cutoff) {
        await db.delete(settings).where(eq(settings.key, row.key))
        count++
      }
    } catch { }
  }
  return json({ cleaned: count })
}
