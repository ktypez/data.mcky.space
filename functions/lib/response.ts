export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function error(msg: string, status = 400): Response {
  return json({ error: msg }, status)
}

export function notFound(): Response {
  return error('Not found', 404)
}

export function unauthorized(): Response {
  return error('Unauthorized', 401)
}
