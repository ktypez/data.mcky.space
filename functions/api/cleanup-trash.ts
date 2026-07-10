import { createDb } from '../lib/db'
import { settings } from '../lib/schema'
import { eq, sql } from 'drizzle-orm'
import { json } from '../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const db = createDb(context.env.DATABASE_URL)
  const days = 30
  const cutoff = Date.now() - days * 86_400_000
  const rows = await db.select().from(settings).where(sql`${settings.key} LIKE 'trash_%'`)
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
