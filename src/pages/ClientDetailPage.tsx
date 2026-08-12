
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import ClientDetail from '@/components/ClientDetail'
import { updateClient } from '@/lib/storage'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useClientStore } from '@/stores/client-store'
import { useUIStore } from '@/stores/ui-store'
import { VerticalBar } from '@/components/ScrollIndicator'
import type { Client } from '@/types'

export default function ClientDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { isAdmin } = useAuthStore()
  const cliStore = useClientStore()
  const mountedRef = useRef(true)
  const frameRef = useRef<HTMLDivElement>(null)

  // Desktop: redirect to / and open detail in side pane instead
  useEffect(() => {
    if (!id) return
    const isDesktop = document.documentElement.getAttribute('data-viewport') === 'desktop'
    if (isDesktop) {
      // Find client from store and open in side pane
      const all = useClientStore.getState().clients
      const found = all.find((c) => c.id === id)
      if (found) {
        useUIStore.getState().openDetail(id, found)
      } else {
        // Fetch then open
        apiFetch(`/api/clients/${encodeURIComponent(id)}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data: Client | null) => {
            if (data && mountedRef.current) {
              useUIStore.getState().openDetail(id, data)
            }
          })
          .catch(() => {})
      }
      navigate('/', { replace: true })
    }
  }, [id, navigate])

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setFetchError(false)
    try {
      const res = await apiFetch(`/api/clients/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('Not found')
      const data: Client = await res.json()
      if (!mountedRef.current) return
      setClient(data)
      setClients([data])
    } catch {
      // Fallback to the already-loaded store list (no extra D1 fetch).
      const all = cliStore.clients
      const found = all.find((c) => c.id === id)
      if (found) {
        setClient(found)
        setClients(all)
      } else {
        setFetchError(true)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [id, cliStore])

  useEffect(() => {
    mountedRef.current = true
    loadData()
    return () => { mountedRef.current = false }
  }, [loadData])

  const handleDelete = useCallback(
    (deletedId: string) => {
      navigate('/')
    },
    [navigate],
  )

  const handleUpdate = useCallback(
    async (updated: Client) => {
      try {
        setUploading(true)
        setUploadProgress(0)
        const saved = await updateClient(updated, setUploadProgress)
        setClient(saved)
        cliStore.updateClient(saved.id, saved)
      } catch {
        // Keep the current store list; no extra D1 fetch on failure.
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [cliStore],
  )

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
    <div className="flex min-h-screen flex-col">
      <div className="app-viewport">
        <div className="flex h-11 shrink-0 items-center gap-2 bg-card px-3 border border-border rounded-[var(--frame-radius)]">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
        </div>

        <div className="app-frame" ref={frameRef}>
          <ClientDetail
            client={client}
            isAdmin={isAdmin}
            clients={clients}
            onClientUpdated={handleUpdate}
            onClientDeleted={handleDelete}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />
        </div>
        <VerticalBar containerRef={frameRef} />
      </div>
    </div>
  )
}
