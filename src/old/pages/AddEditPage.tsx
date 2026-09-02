
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import { addClient, updateClient } from '@/lib/storage'
import type { Client } from '@/types/index'
import InlineAddEditView from '@/old/components/InlineAddEditView'

export default function AddEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { clients, initialize } = useClientStore()
  const cliStore = useClientStore()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)

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
        setSaveError(null)
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
      } catch (e) {
        // Keep the form open with the user's data intact so they can retry
        // (e.g. photo upload failed — nothing was silently dropped).
        setSaveError(e instanceof Error ? e.message : 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่')
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
    <InlineAddEditView
      editClient={editClient}
      clients={clients}
      onBack={() => navigate('/')}
      onSave={handleSave}
      uploading={uploading}
      uploadProgress={uploadProgress}
      error={saveError}
    />
  )
}
