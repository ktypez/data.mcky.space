import { createDb } from '../../lib/db'
import { clients } from '../../lib/schema'
import { sql } from 'drizzle-orm'
import { json } from '../../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const db = createDb(context.env.DATABASE_URL)
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(clients)
  return json({ count: result[0]?.count ?? 0 })
}
