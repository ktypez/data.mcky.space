import { describe, expect, it } from 'vitest'
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { clientDataResponse, clientCorsHeaders } from '../../api/src/data-cache'

describe('public client conditional responses', () => {
  it('stamps rev etags, returns an empty 304, and keeps typed JSON responses', async () => {
    let rev = 1
    const rows = [{ id: 'a', notes: 'first' }, { id: 'b', notes: '' }]
    const app = new Elysia()
      .use(cors({ origin: 'https://data.mcky.space', ...clientCorsHeaders }))
      .mapResponse(async ({ request, response, set }) => clientDataResponse(request, response, set.status, set, rev))
      .get('/api/clients', () => rows, { response: t.Array(t.Object({ id: t.String(), notes: t.String() })) })
    const request = (etag?: string) => new Request('http://localhost/api/clients', {
      headers: { Origin: 'https://data.mcky.space', ...(etag ? { 'If-None-Match': etag } : {}) },
    })
    const first = await app.handle(request())
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual(rows)
    expect(first.headers.get('ETag')).toBe('"rev-1"')
    expect(first.headers.get('Cache-Control')).toContain('no-cache')
    expect(first.headers.get('Access-Control-Expose-Headers')).toContain('ETag')
    const unchanged = await app.handle(request(`"other", W/"rev-1"`))
    expect(unchanged.status).toBe(304)
    expect(await unchanged.text()).toBe('')
    // Same body but bumped rev (e.g. an unrelated client changed) → 200 again.
    rev = 2
    const bumped = await app.handle(request('"rev-1"'))
    expect(bumped.status).toBe(200)
    expect(bumped.headers.get('ETag')).toBe('"rev-2"')
    const preflight = await app.handle(new Request('http://localhost/api/clients', {
      method: 'OPTIONS', headers: { Origin: 'https://data.mcky.space', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'if-none-match' },
    }))
    expect(preflight.headers.get('Access-Control-Allow-Headers')?.toLowerCase()).toContain('if-none-match')
  })
  it('does not cache admin routes, errors, mutations, or unreadable revisions', async () => {
    const set = { headers: {} as Record<string, string | number> }
    for (const path of ['/api/clients/trash', '/api/auth', '/api/clients/search', '/api/profile/theme']) {
      expect(await clientDataResponse(new Request(`http://localhost${path}`), [], 200, set, 7)).toBeUndefined()
    }
    expect(await clientDataResponse(new Request('http://localhost/api/clients/a'), { error: 'Not found' }, 404, set, 7)).toBeUndefined()
    expect(await clientDataResponse(new Request('http://localhost/api/clients', { method: 'POST' }), {}, 200, set, 7)).toBeUndefined()
    // Counter unreadable → no validator at all, never a stale 304.
    expect(await clientDataResponse(new Request('http://localhost/api/clients/list'), [], 200, set, -1)).toBeUndefined()
    expect(await clientDataResponse(new Request('http://localhost/api/clients/list'), [], 200, set, null)).toBeUndefined()
  })
})
