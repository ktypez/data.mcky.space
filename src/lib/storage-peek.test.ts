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
vi.mock('./demo', () => ({ isDemoMode: () => false }))
vi.mock('./treaty', () => ({ treatyClient: {}, treatyHeaders: async () => ({}) }))
vi.mock('./api', () => ({ clerkToken: async () => null }))

const DETAIL_URL = 'https://data-api.fall3n.workers.dev/api/clients/a?raw=true'

beforeEach(() => { disk.clear(); vi.resetModules(); vi.unstubAllGlobals() })

describe('peekClientById stale reads', () => {
  it('returns the cached full record without touching the network', async () => {
    const fetcher = vi.fn(async () => { throw new Error('must not fetch') })
    vi.stubGlobal('fetch', fetcher)
    disk.set(DETAIL_URL, {
      url: DETAIL_URL,
      body: JSON.stringify({ id: 'a', name: '["ชื่อ"]', shopName: 'shop', address: 'addr', lat: null, lng: null, images: [], badge: null, notes: null, createdAt: 1, updatedAt: 2 }),
      etag: '"rev-9"',
      checkedAt: Date.now(),
    })
    const { peekClientById } = await import('./storage')
    const cached = await peekClientById('a')
    expect(cached?.id).toBe('a')
    expect(cached?.name).toEqual(['ชื่อ'])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns null when the record was never cached here', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('must not fetch') }))
    const { peekClientById } = await import('./storage')
    expect(await peekClientById('missing')).toBeNull()
  })
})
