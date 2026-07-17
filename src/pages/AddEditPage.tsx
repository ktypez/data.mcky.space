
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { addClient, updateClient } from '@/lib/storage'
import type { Client } from '@/types'
import InlineAddEditView from '@/components/InlineAddEditView'

export default function AddEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { clients, initialize } = useClientStore()
  const cliStore = useClientStore()
  const { isAdmin } = useAuthStore()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    initialize()
  }, [initialize])

  const editClient: Client | null =
    id ? clients.find((c) => c.id === id) ?? null : null

  const handleSave = useCallback(
    async (data: Omit<Client, 'createdAt' | 'updatedAt'>) => {
      const existing = clients.find((c) => c.id === data.id)
      try {
        setUploading(true)
        setUploadProgress(0)
        let saved: Client
        if (existing) {
          const updated: Client = {
            ...data,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
          }
          saved = await updateClient(updated, setUploadProgress)
          cliStore.updateClient(saved.id, saved)
        } else {
          const nc: Client = {
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          saved = await addClient(nc, setUploadProgress)
          cliStore.addClient(saved)
        }
        navigate('/')
      } catch {
        cliStore.refresh()
          .then(() => {})
          .catch(() => console.warn('Refresh failed after save'))
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [clients, navigate],
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InlineAddEditView
        editClient={editClient}
        clients={clients}
        onBack={() => navigate('/')}
        onSave={handleSave}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />
    </div>
  )
}
