import { describe, expect, it } from 'vitest'
import { Elysia, status } from 'elysia'

// Guards the exact wiring used by api/src/index.ts: an `admin` macro whose
// beforeHandle returns an early 401, plus a mapResponse hook that delegates
// to an async helper (the ETag/304 pass-through). A sync mapResponse wrapper
// returning the helper's Promise made Elysia resolve the early 401 to
// `undefined`, and workerd threw `Promise did not resolve to 'Response'`
// for every unauthenticated admin request (live: HTTP 500 / error 1101).
async function buildApp() {
  const delegate = async (): Promise<Response | undefined> => undefined
  return new Elysia()
    .macro('admin', {
      async beforeHandle({ request }) {
        if (!request.headers.get('authorization')) {
          return status(401, { error: 'Unauthorized' })
        }
      },
    })
    // Must stay async — see note above.
    .mapResponse(async () => delegate())
    .get('/secret', () => ({ ok: true }), { admin: true })
    .get('/public', () => ({ ok: true }))
}

describe('admin gate + async mapResponse delegation', () => {
  it('returns a real 401 Response for guests, not undefined', async () => {
    const app = await buildApp()
    const res = await app.handle(new Request('http://localhost/secret'))
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('lets authorized and public requests through', async () => {
    const app = await buildApp()
    const authed = await app.handle(
      new Request('http://localhost/secret', { headers: { authorization: 'Bearer x' } }),
    )
    expect(authed.status).toBe(200)
    const pub = await app.handle(new Request('http://localhost/public'))
    expect(pub.status).toBe(200)
  })
})
