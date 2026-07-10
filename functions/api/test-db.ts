import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../lib/schema'
import { eq } from 'drizzle-orm'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  try {
    const sql = neon(context.env.DATABASE_URL)
    const db = drizzle(sql, { schema })
    const result = await db.select().from(schema.settings).where(eq(schema.settings.key, 'admin_pw_hash'))
    return new Response(JSON.stringify({ ok: true, count: result.length }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e), stack: e?.stack || '' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
