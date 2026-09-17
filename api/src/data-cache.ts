// Only these existing public reads participate; never auth/admin/search.
export const clientCorsHeaders = {
  allowedHeaders: ['Content-Type', 'Authorization', 'x-clerk-check', 'x-admin-token', 'If-None-Match'],
  exposeHeaders: ['ETag'],
}

export async function clientDataResponse(request: Request, data: unknown, status: unknown): Promise<Response | undefined> {
  const path = new URL(request.url).pathname
  if (request.method !== 'GET' || (status !== undefined && status !== 200)) return
  if (path !== '/api/clients' && path !== '/api/clients/list' &&
      !/^\/api\/clients\/(?!trash$|count$|search$)[^/]+$/.test(path)) return
  if (data instanceof Response || data === undefined) return
  const body = JSON.stringify(data)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  const etag = `"${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}"`
  const matches = request.headers.get('If-None-Match')?.split(',').some(tag => {
    const value = tag.trim().replace(/^W\//, '')
    return value === '*' || value === etag
  })
  return new Response(matches ? null : body, {
    status: matches ? 304 : 200,
    headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'public, no-cache, must-revalidate' },
  })
}
