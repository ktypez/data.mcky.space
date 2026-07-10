import { useState, useEffect, useCallback } from 'react'
import type { Client } from '@/types'
import { fetchClients } from '@/lib/storage'
import { getAllClients } from '@/lib/offline-db'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async (limit?: number) => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchClients(limit)
      setClients(data)
      return data
    } catch (e) {
      console.error('Failed to load clients', e)
      setError(true)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.resolve().then(async () => {
      if (!active) return
      try {
        const idb = await getAllClients()
        if (idb.length > 0) {
          const sorted = (idb as unknown as Client[]).sort((a, b) => b.updatedAt - a.updatedAt)
          setClients(sorted)
          setLoading(false)
        }
      } catch {}
      fetchClients()
        .then((data) => { if (active) setClients(data) })
        .catch(() => {})
    })
    return () => { active = false }
  }, [refresh])

  return {
    clients,
    setClients,
    loading,
    error,
    refresh,
  }
}
