interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, Promise<any>>()
  
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 60_000 // 1 นาทีถ้าถ้าไม่ใส่
  ): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    
    // มี request อยู่แล้วแล้วไหม
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>
    }
    
    const promise = fetcher()
      .then(data => {
        this.cache.set(key, { data, timestamp: Date.now(), ttl })
        this.pendingRequests.delete(key)
        return data
      })
      .catch(error => {
        this.pendingRequests.delete(key)
        throw error
      })
    
    this.pendingRequests.set(key, promise)
    return promise
  }
  
  clearPattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new SmartCache()