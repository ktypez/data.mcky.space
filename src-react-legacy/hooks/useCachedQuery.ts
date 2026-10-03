import { useState, useEffect } from 'react'
import { cache } from '@/lib/cache'

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    cache.get(key, fetcher, ttl)
      .then(result => {
        if (mounted) setData(result)
      })
      .catch(err => {
        if (mounted) setError(err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    
    return () => {
      mounted = false
    }
  }, [key, fetcher, ttl])
  
  return { data, loading, error }
}