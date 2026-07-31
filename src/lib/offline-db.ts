const DB_NAME = 'ezzydata-offline'
const DB_VERSION = 2
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('clients')) {
          const store = db.createObjectStore('clients', { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        dbPromise = null
        reject(req.error)
      }
    })
  }
  return dbPromise
}

/**
 * M4 fix: purge expired entries from IDB. Previously this only happened
 * during `getAllClients`, which means if a user never called that function
 * (e.g. they only did write actions), the IDB would grow unbounded.
 *
 * Call this from any long-lived context — e.g. a periodic timer on app
 * startup, or after a successful network refresh.
 */
export async function purgeExpiredClients(): Promise<number> {
  const db = await getDb()
  const tx = db.transaction('clients', 'readwrite')
  const store = tx.objectStore('clients')
  const all = await promisifyRequest(store.getAll())
  const now = Date.now()
  let purged = 0
  for (const c of all) {
    const updatedAt = (c as Record<string, unknown>).updatedAt as number
    if (now - updatedAt >= CACHE_TTL) {
      store.delete((c as Record<string, unknown>).id as IDBValidKey)
      purged++
    }
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return purged
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllClients(): Promise<Record<string, unknown>[]> {
  const db = await getDb()
  const tx = db.transaction('clients', 'readwrite')
  const store = tx.objectStore('clients')
  const all = await promisifyRequest(store.getAll())
  const now = Date.now()
  const valid: Record<string, unknown>[] = []
  for (const c of all) {
    const updatedAt = (c as Record<string, unknown>).updatedAt as number
    if (now - updatedAt < CACHE_TTL) {
      valid.push(c as Record<string, unknown>)
    } else {
      store.delete((c as Record<string, unknown>).id as IDBValidKey)
    }
  }
  return valid
}

export async function putClient(client: Record<string, unknown>): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('clients', 'readwrite')
  await promisifyRequest(tx.objectStore('clients').put(client) as unknown as IDBRequest<IDBValidKey>)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function putClients(clients: Record<string, unknown>[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('clients', 'readwrite')
  const store = tx.objectStore('clients')
  for (const c of clients) {
    store.put(c)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('clients', 'readwrite')
  await promisifyRequest(tx.objectStore('clients').delete(id))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
