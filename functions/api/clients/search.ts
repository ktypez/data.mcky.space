import { createDb } from '../../lib/db'
import { clients } from '../../lib/schema'
import { ilike, or, and } from 'drizzle-orm'
import { json, error } from '../../lib/response'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  if (!q || !q.trim()) return json([])

  const keywords = q.trim().split(/\s+/).filter(Boolean)
  const conditions = keywords.map((kw) => {
    const pattern = `%${kw}%`
    return or(ilike(clients.name, pattern), ilike(clients.shopName, pattern))
  })

  const db = createDb(env.DATABASE_URL)
  const rows = await db.select().from(clients).where(and(...conditions)).limit(10)
  return json(rows)
}
