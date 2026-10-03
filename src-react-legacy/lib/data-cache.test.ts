import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDataCache, type CachedResponse } from './data-cache'

afterEach(() => { vi.useRealTimers() })

function fixture() {
  const records = new Map<string, CachedResponse>()
  const disk = {
    get: async (url: string) => records.get(url),
    put: async (entry: CachedResponse) => { records.set(entry.url, structuredClone(entry)) },
    remove: async (url: string) => { records.delete(url) },
    keys: async () => [...records.keys()],
  }
  const fetcher = vi.fn<typeof fetch>()
  // Travel past the fresh window so the next get() revalidates (fake
  // timers stay on until afterEach restores them).
  const ageAll = (ms = 60_000) => {
    vi.useFakeTimers()
    vi.advanceTimersByTime(ms)
  }
  return { records, disk, fetcher, cache: createDataCache(disk, fetcher), ageAll }
}
const url = 'https://data-api.fall3n.workers.dev/api/clients/list'
const ok = (body: unknown, etag = '"one"') => new Response(JSON.stringify(body), { headers: { ETag: etag } })

describe('exact public response cache', () => {
  it('preserves the catalog for cold offline startup after a full refresh', async () => {
    const { cache, fetcher, disk } = fixture()
    fetcher.mockResolvedValueOnce(ok([{ id: 'a' }]))
      .mockResolvedValueOnce(ok([{ id: 'a', notes: 'full' }], '"full"'))
    await cache.get(url)
    await cache.get(url.replace('/list', ''))
    const restarted = createDataCache(disk, fetcher)
    expect(await restarted.peek(url)).toMatchObject({ data: [{ id: 'a' }] })
  })
  it('invalidates other representations on a changed catalog, including deletions', async () => {
    const { cache, fetcher, records, ageAll } = fixture()
    const detail = url.replace('/list', '/a?raw=true')
    fetcher.mockResolvedValueOnce(ok([{ id: 'a' }])).mockResolvedValueOnce(ok({ id: 'a', notes: 'full' }))
      .mockResolvedValueOnce(ok([], '"deleted"')).mockRejectedValue(new TypeError('offline'))
    await cache.get(url)
    await cache.get(detail)
    ageAll()
    await cache.get(url)
    expect(records.has(detail)).toBe(false)
    await expect(cache.get(detail)).rejects.toThrow()
    expect((await cache.get(url)).data).toEqual([])
  })
  it('rejects late responses after explicit invalidation and never persists them', async () => {
    const { cache, fetcher, records } = fixture()
    let resolve!: (response: Response) => void
    fetcher.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const pending = cache.get(url)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled())
    await cache.invalidate()
    resolve(ok([{ id: 'deleted' }]))
    await expect(pending).rejects.toThrow('superseded')
    expect(records.size).toBe(0)
  })
  it('evicts a cached detail after 404 rather than returning it offline later', async () => {
    const { cache, fetcher, ageAll } = fixture()
    const detail = url.replace('/list', '/a?raw=true')
    fetcher.mockResolvedValueOnce(ok({ id: 'a' })).mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockRejectedValue(new TypeError('offline'))
    await cache.get(detail)
    ageAll()
    await expect(cache.get(detail)).rejects.toThrow('404')
    await expect(cache.get(detail)).rejects.toThrow('offline')
  })
  it('falls back after network failure including empty snapshots, but never across URLs', async () => {
    const { cache, fetcher, disk, ageAll } = fixture()
    fetcher.mockResolvedValueOnce(ok([])).mockRejectedValue(new TypeError('offline'))
    await cache.get(url)
    ageAll()
    const restarted = createDataCache(disk, fetcher)
    expect(await restarted.get(url)).toMatchObject({ data: [], offline: true })
    await expect(restarted.get(url.replace('/list', '/a?raw=true'))).rejects.toThrow()
  })
  it('retries an unmatched 304 without a validator and does not silently return stale data on HTTP errors', async () => {
    const { cache, fetcher, ageAll } = fixture()
    fetcher.mockResolvedValueOnce(ok(['old']))
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { ETag: '"different"' } }))
      .mockResolvedValueOnce(ok(['new'], '"two"'))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
    await cache.get(url)
    ageAll()
    expect((await cache.get(url)).data).toEqual(['new'])
    expect(new Headers(fetcher.mock.calls[2][1]?.headers).has('If-None-Match')).toBe(false)
    ageAll()
    await expect(cache.get(url)).rejects.toThrow('403')
  })
  it('returns successful network data even when IndexedDB is unavailable', async () => {
    const { fetcher } = fixture()
    const fail = async () => { throw new Error('IDB blocked') }
    const cache = createDataCache({ get: fail, put: fail, remove: fail, keys: fail }, fetcher)
    fetcher.mockResolvedValueOnce(ok(['fresh']))
    expect((await cache.get(url)).data).toEqual(['fresh'])
  })
  it('does not cache private endpoints', async () => {
    const { cache, fetcher } = fixture()
    await expect(cache.get(url.replace('/list', '/trash'))).rejects.toThrow('public')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('persists body and ETag together and reuses that body on a matching empty 304', async () => {
    const { cache, records, fetcher, ageAll } = fixture()
    const body = [{ id: 'a', name: '["name"]' }]
    fetcher.mockResolvedValueOnce(ok(body)).mockResolvedValueOnce(new Response(null, { status: 304, headers: { ETag: '"one"' } }))
    expect((await cache.get(url)).data).toEqual(body)
    expect(records.get(url)).toMatchObject({ url, etag: '"one"', body: JSON.stringify(body) })
    ageAll()
    expect((await cache.get(url)).data).toEqual(body)
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get('If-None-Match')).toBe('"one"')
    expect(fetcher.mock.calls[1][1]).toMatchObject({ credentials: 'omit', cache: 'no-store' })
  })
  it('serves fresh snapshots without revalidating and shares one fetch between concurrent reads', async () => {
    const { cache, fetcher, ageAll } = fixture()
    fetcher.mockResolvedValueOnce(ok(['v1']))
    expect((await cache.get(url)).data).toEqual(['v1'])
    expect(fetcher).toHaveBeenCalledTimes(1)
    // Immediate second read: no network at all.
    expect((await cache.get(url)).data).toEqual(['v1'])
    expect(fetcher).toHaveBeenCalledTimes(1)
    // Concurrent reads share a single fetch.
    ageAll()
    fetcher.mockResolvedValueOnce(ok(['v2'], '"two"'))
    const [a, b] = await Promise.all([cache.get(url), cache.get(url)])
    expect(a.data).toEqual(['v2'])
    expect(b.data).toEqual(['v2'])
    expect(fetcher).toHaveBeenCalledTimes(2)
    // Stale again after the window: revalidates with the stored validator.
    ageAll()
    fetcher.mockResolvedValueOnce(new Response(null, { status: 304, headers: { ETag: '"two"' } }))
    expect((await cache.get(url)).data).toEqual(['v2'])
    expect(new Headers(fetcher.mock.calls[2][1]?.headers).get('If-None-Match')).toBe('"two"')
  })
})
