// Neon-specific test — no longer needed with D1.
// This endpoint now tests the D1 binding instead.
import { createDb } from '../lib/db'
import { settings } from '../lib/schema'

export async function onRequestGet(context: EventContext<Env, any, any>) {
  try {
    const db = createDb(context.env.DB)
    const result = await db.select().from(settings)
    return new Response(JSON.stringify({ ok: true, count: result.length, d1: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
