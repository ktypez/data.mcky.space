// Only these existing public reads participate; never auth/admin/search.
export const clientCorsHeaders = {
  allowedHeaders: ['Content-Type', 'Authorization', 'x-clerk-check', 'x-admin-token', 'If-None-Match'],
  exposeHeaders: ['ETag'],
}

// ----------------------------------------------------------------------------
// Catalog revision ETags — `rev-N`, not a hash of the body, so a revalidation
// costs one indexed settings-row read (done by the caller) instead of a full
// D1 scan + SHA-256 over every client row. Every clients-table mutation must
// bump the counter (see bumpClientsRev in index.ts); trash/audit purges don't
// touch clients data and don't bump. This module stays pure (no D1 import) so
// the contract is unit-testable from the frontend workspace.
// ----------------------------------------------------------------------------

function etagMatches(request: Request, etag: string): boolean {
  return request.headers.get('If-None-Match')?.split(',').some(tag => {
    const value = tag.trim().replace(/^W\//, '')
    return value === '*' || value === etag
  }) ?? false
}

export async function clientDataResponse(
  request: Request,
  data: unknown,
  status: unknown,
  set: { headers: Record<string, string | number> },
  rev: number | null,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname
  if (request.method !== 'GET' || (status !== undefined && status !== 200)) return
  if (path !== '/api/clients' && path !== '/api/clients/list' &&
      !/^\/api\/clients\/(?!trash$|count$|search$)[^/]+$/.test(path)) return
  if (data instanceof Response || data === undefined) return
  // A null/negative rev means the counter was unreadable — skip ETag handling
  // entirely rather than serving a made-up validator.
  if (rev == null || rev < 0) return
  const etag = `"rev-${rev}"`
  if (etagMatches(request, etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'public, no-cache, must-revalidate' },
    })
  }
  // 200s keep the handler's own body — just stamp the validator so the next
  // read can revalidate cheaply. (set.headers survives encoding; verified live.)
  set.headers['ETag'] = etag
  set.headers['Cache-Control'] = 'public, no-cache, must-revalidate'
  return
}
