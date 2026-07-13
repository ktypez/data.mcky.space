import { createDb } from '../lib/db'
import { settings } from '../lib/schema'
import { eq } from 'drizzle-orm'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  try {
    const db = createDb(context.env.DB)
    const result = await db.select().from(settings).where(eq(settings.key, 'admin_pw_hash'))
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
