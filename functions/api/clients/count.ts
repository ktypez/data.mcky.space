import { createDb } from '../../lib/db'
import { clients } from '../../lib/schema'
import { sql } from 'drizzle-orm'
import { json } from '../../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const db = createDb(context.env.DB)
  const result = await db.select({ count: sql<number>`count(*)` }).from(clients)
  return json({ count: result[0]?.count ?? 0 })
}
