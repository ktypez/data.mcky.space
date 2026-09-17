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

beforeEach(() => { disk.clear(); vi.resetModules(); vi.unstubAllGlobals() })
describe('storage public offline reads', () => {
  it('reopens exact catalog offline, but never makes full/detail data from lightweight rows', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([
      { id: 'a', name: '["name"]', shopName: 'shop', image: null, thumb: null, badge: null, createdAt: 1, updatedAt: 1 },
    ]), { headers: { ETag: '"catalog"' } })).mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetcher)
    let storage = await import('./storage')
    expect((await storage.fetchClientList())[0].name).toEqual(['name'])
    vi.resetModules()
    storage = await import('./storage')
    expect((await storage.fetchClientList())[0].id).toBe('a')
    await expect(storage.fetchClients()).rejects.toThrow()
    expect(await storage.fetchClientById('a')).toBeNull()
  })
})
