import { describe, expect, it } from 'vitest'
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { clientDataResponse, clientCorsHeaders } from '../../api/src/data-cache'

describe('public client conditional responses', () => {
  it('hashes the actual representation, returns an empty 304, and keeps typed JSON responses', async () => {
    let rows = [{ id: 'a', notes: 'first' }, { id: 'b', notes: '' }]
    const app = new Elysia()
      .use(cors({ origin: 'https://data.mcky.space', ...clientCorsHeaders }))
      .mapResponse(({ request, response, set }) => clientDataResponse(request, response, set.status))
      .get('/api/clients', () => rows, { response: t.Array(t.Object({ id: t.String(), notes: t.String() })) })
    const request = (etag?: string) => new Request('http://localhost/api/clients', {
      headers: { Origin: 'https://data.mcky.space', ...(etag ? { 'If-None-Match': etag } : {}) },
    })
    const first = await app.handle(request())
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual(rows)
    const etag = first.headers.get('ETag')!
    expect(etag).toMatch(/^"[a-f0-9]{64}"$/)
    expect(first.headers.get('Cache-Control')).toContain('no-cache')
    expect(first.headers.get('Access-Control-Expose-Headers')).toContain('ETag')
    const unchanged = await app.handle(request(`"other", W/${etag}`))
    expect(unchanged.status).toBe(304)
    expect(await unchanged.text()).toBe('')
    rows = rows.slice(0, 1) // deletion, without changing the surviving row timestamp
    const deleted = await app.handle(request(etag))
    expect(deleted.status).toBe(200)
    expect(deleted.headers.get('ETag')).not.toBe(etag)
    const deletedTag = deleted.headers.get('ETag')
    rows[0].notes = 'changed'
    expect((await app.handle(request())).headers.get('ETag')).not.toBe(deletedTag)
    const preflight = await app.handle(new Request('http://localhost/api/clients', {
      method: 'OPTIONS', headers: { Origin: 'https://data.mcky.space', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'if-none-match' },
    }))
    expect(preflight.headers.get('Access-Control-Allow-Headers')?.toLowerCase()).toContain('if-none-match')
  })
  it('does not cache admin routes, errors or mutations', async () => {
    for (const path of ['/api/clients/trash', '/api/auth', '/api/clients/search', '/api/profile/theme']) {
      expect(await clientDataResponse(new Request(`http://localhost${path}`), [], 200)).toBeUndefined()
    }
    expect(await clientDataResponse(new Request('http://localhost/api/clients/a'), { error: 'Not found' }, 404)).toBeUndefined()
    expect(await clientDataResponse(new Request('http://localhost/api/clients', { method: 'POST' }), {}, 200)).toBeUndefined()
  })
})
