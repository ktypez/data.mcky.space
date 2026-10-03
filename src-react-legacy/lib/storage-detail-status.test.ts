import { beforeEach, describe, expect, it, vi } from 'vitest'

const disk = vi.hoisted(() => new Map<string, unknown>())
vi.mock('./offline-db', () => ({
  responseStorage: {
    get: async (url: string) => disk.get(url),
    put: async (entry: { url: string }) => { disk.set(entry.url, structuredClone(entry)) },
    remove: async (url: string) => { disk.delete(url) },
    keys: async () => [...disk.keys()],
  },
}))
vi.mock('./treaty', () => ({ treatyClient: {}, treatyHeaders: async () => ({}) }))
vi.mock('./api', () => ({ clerkToken: async () => null }))

const detailUrl = 'https://data-api.fall3n.workers.dev/api/clients/a?raw=true'
const detailBody = JSON.stringify({ id: 'a', name: '["ชื่อ"]', shopName: '["ร้าน"]', address: 'ที่อยู่', lat: 13.7, lng: 100.5, images: [], badge: null, notes: null, createdAt: 1, updatedAt: 2 })

beforeEach(() => {
  disk.clear()
  vi.resetModules()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('detail read status', () => {
  it('distinguishes a server 404 from a transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Not found' }, { status: 404 })))
    const { fetchClientByIdResult } = await import('./storage')
    await expect(fetchClientByIdResult('a')).resolves.toEqual({ status: 'not-found' })
  })

  it('returns an error status when the request fails without a cache', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network') }))
    const { fetchClientByIdResult } = await import('./storage')
    const result = await fetchClientByIdResult('a')
    expect(result.status).toBe('error')
  })

  it('returns a cached client as offline when revalidation fails', async () => {
    disk.set(detailUrl, { url: detailUrl, body: detailBody, etag: '"old"', checkedAt: Date.now() - 31_000 })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    const { fetchClientByIdResult } = await import('./storage')
    const result = await fetchClientByIdResult('a')
    expect(result).toMatchObject({ status: 'offline' })
    if (result.status === 'offline') expect(result.client?.address).toBe('ที่อยู่')
  })
})
