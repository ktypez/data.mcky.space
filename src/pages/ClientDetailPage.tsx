'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import ClientDetail from '@/components/ClientDetail'
import { fetchClients } from '@/lib/storage'
import { apiFetch } from '@/lib/api'
import type { Client } from '@/types'

export default function ClientDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('ezzylist_admin_token')
    apiFetch('/api/auth', { headers: token ? { 'x-admin-token': token } : {} })
      .then((r) => { if (r.ok) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setFetchError(false)
    try {
      const res = await apiFetch(`/api/clients/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('Not found')
      const data: Client = await res.json()
      setClient(data)
      setClients([data])
    } catch {
      try {
        const all = await fetchClients()
        const found = all.find((c) => c.id === id)
        if (found) {
          setClient(found)
          setClients(all)
        } else {
          setFetchError(true)
        }
      } catch {
        setFetchError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let active = true
    loadData()
    return () => { active = false }
  }, [loadData])

  const handleDelete = useCallback(
    (deletedId: string) => {
      navigate('/')
    },
    [navigate],
  )

  const handleUpdate = useCallback((updated: Client) => {
    setClient(updated)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner size={20} />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <p className="text-lg font-medium text-foreground">Failed to load data</p>
          <p className="text-sm text-muted-foreground">Check your connection</p>
          <Button onClick={loadData}>Try again</Button>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <p className="text-2xl font-bold text-foreground">Client not found</p>
          <p className="text-sm text-muted-foreground">This link may be expired or the data was deleted</p>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back to home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2 bg-card px-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="size-3.5" />
          Back
        </Button>
      </div>

      <ClientDetail
        client={client}
        isAdmin={isAdmin}
        clients={clients}
        onClientUpdated={handleUpdate}
        onClientDeleted={handleDelete}
        hideActions
      />
    </div>
  )
}
