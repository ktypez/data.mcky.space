export interface CachedResponse {
  url: string
  body: string
  etag: string
  checkedAt: number
}
export interface ResponseStorage {
  get(url: string): Promise<CachedResponse | undefined>
  put(entry: CachedResponse): Promise<void>
  remove(url: string): Promise<void>
  keys(): Promise<string[]>
}
export interface DataResult<T> { data: T; offline: boolean; lastChecked: number }

export class DataHttpError extends Error {
  constructor(public status: number) { super(`Client data request failed: ${status}`) }
}

function isPublicUrl(url: string): boolean {
  const parsed = new URL(url)
  return parsed.origin === 'https://data-api.fall3n.workers.dev' &&
    (parsed.pathname === '/api/clients' || parsed.pathname === '/api/clients/list' ||
      /^\/api\/clients\/(?!trash$|count$|search$)[^/]+$/.test(parsed.pathname))
}

export function createDataCache(storage: ResponseStorage, fetcher: typeof fetch = (...args) => fetch(...args)) {
  const memory = new Map<string, CachedResponse>()
  let generation = 0
  let diskReadable = true
  let commits: Promise<unknown> = Promise.resolve()
  const requests = new Map<string, number>()
  function serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = commits.then(work)
    commits = result.catch(() => {})
    return result
  }
  async function clearExcept(keep?: string) {
    const keys = new Set([...memory.keys(), ...await storage.keys().catch(() => { diskReadable = false; return [] })])
    for (const key of keys) if (key !== keep) {
      memory.delete(key)
      await storage.remove(key).catch(() => { diskReadable = false })
    }
  }
  async function invalidate() {
    generation++ // synchronous: fence every in-flight response before I/O
    await serialize(() => clearExcept())
  }
  async function read(url: string) {
    const entry = memory.get(url) ?? (diskReadable ? await storage.get(url).catch(() => undefined) : undefined)
    if (!entry || entry.url !== url || !entry.etag || Date.now() - entry.checkedAt > 30 * 86400_000) return
    try { JSON.parse(entry.body); return entry } catch { return }
  }
  async function save(entry: CachedResponse) {
    memory.set(entry.url, entry)
    await storage.put(entry).catch(() => {})
  }
  return {
    invalidate,
    async peek<T>(url: string): Promise<DataResult<T> | undefined> {
      if (!isPublicUrl(url)) return
      const entry = await read(url)
      if (entry) return { data: JSON.parse(entry.body) as T, offline: true, lastChecked: entry.checkedAt }
    },
    async get<T>(url: string): Promise<DataResult<T>> {
      if (!isPublicUrl(url)) throw new Error('Only public client reads can be cached')
      const started = generation
      const sequence = (requests.get(url) ?? 0) + 1
      requests.set(url, sequence)
      const assertCurrent = () => {
        if (started !== generation || sequence !== requests.get(url)) throw new Error('Client data request superseded')
      }
      const cached = await read(url)
      assertCurrent()
      const request = (etag?: string) => fetcher(url, { credentials: 'omit', cache: 'no-store', headers: etag ? { 'If-None-Match': etag } : {} })
      let response: Response
      try {
        response = await request(cached?.etag)
      } catch (error) {
        assertCurrent()
        if (cached) return { data: JSON.parse(cached.body) as T, offline: true, lastChecked: cached.checkedAt }
        throw error
      }
      assertCurrent()
      if (response.status === 304) {
        if (cached && response.headers.get('ETag') === cached.etag) {
          const entry = { ...cached, checkedAt: Date.now() }
          await serialize(async () => { assertCurrent(); await save(entry) })
          assertCurrent()
          return { data: JSON.parse(entry.body) as T, offline: false, lastChecked: entry.checkedAt }
        }
        // A validator without its exact representation cannot supply data.
        response = await request()
      }
      assertCurrent()
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) await invalidate()
        throw new DataHttpError(response.status)
      }
      const body = await response.text()
      const data = JSON.parse(body) as T
      const etag = response.headers.get('ETag')
      const checkedAt = Date.now()
      await serialize(async () => {
        assertCurrent()
        // The list is authoritative. Never splice a different body under an
        // existing ETag. Invalidate full/detail snapshots on catalog change.
        const path = new URL(url).pathname
        if (path === '/api/clients/list' && cached?.body !== body) {
          generation++
          await clearExcept(url)
        }
        if (etag) await save({ url, body, etag, checkedAt })
        else {
          memory.delete(url)
          await storage.remove(url).catch(() => { diskReadable = false })
        }
      })
      return { data, offline: false, lastChecked: checkedAt }
    },
  }
}
