import { neon } from '@neondatabase/serverless'

export async function onRequestGet() {
  try {
    const neonFn = typeof neon
    return new Response(JSON.stringify({ ok: true, neon: neonFn }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
