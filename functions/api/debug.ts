interface EventContext<E = any, P = any, D = any> {
  request: Request
  env: E
  params: P
  data: D
  next: (request?: Request) => Promise<Response>
  waitUntil: (promise: Promise<void>) => void
}

export async function onRequestGet(context: EventContext) {
  const env = context.env as Record<string, unknown>
  const keys = Object.keys(env)
  const info: Record<string, string> = {}
  for (const k of keys) {
    const v = env[k]
    if (typeof v === 'string') {
      info[k] = v.length > 0 ? `len=${v.length}, start=${v.slice(0, 10)}...` : 'EMPTY'
    } else if (v && typeof v === 'object') {
      info[k] = `object: ${(v as any).constructor?.name}`
    } else {
      info[k] = String(v)
    }
  }
  return new Response(JSON.stringify({ keys, info }, null, 2), {
    headers: { 'content-type': 'application/json' },
  })
}
