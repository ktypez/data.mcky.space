export async function onRequestGet() {
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode('test'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('hello'))
    return new Response(JSON.stringify({ ok: true, sig: Array.from(new Uint8Array(sig)).slice(0, 4) }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e), stack: e?.stack }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
