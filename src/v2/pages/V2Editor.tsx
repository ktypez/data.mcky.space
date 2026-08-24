import { Suspense, useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { addClient, updateClient } from '@/lib/storage'
import type { Client } from '@/types'
import InlineAddEditView from '@/components/InlineAddEditView'

/**
 * V2Editor — /v2/add and /v2/edit/:id.
 * Save pipeline mirrors the classic page exactly (storage.ts + store
 * mutations, keep-form-open-on-error); only navigation is v2-flavored:
 * success lands on the v2 record page instead of the classic list.
 *
 * Layout: InlineAddEditView owns its own width/padding (max-w-4xl p-4
 * md:p-6), so the header row mirrors that rhythm to stay edge-aligned.
 */
export default function V2Editor() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const clients = useClientStore((s) => s.clients)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)

  const editClient: Client | null =
    id ? clients.find((c) => c.id === id) ?? null : null

  const handleSave = useCallback(
    async (data: Omit<Client, 'createdAt' | 'updatedAt'>) => {
      const store = useClientStore.getState()
      const existing = store.clients.find((c) => c.id === data.id)
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
          store.updateClient(saved.id, saved)
        } else {
          const nc: Client = {
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          saved = await addClient(nc, setUploadProgress)
          store.addClient(saved)
        }
        navigate(`/v2/c/${saved.id}`)
      } catch (e) {
        // Keep the form open with the user's data intact so they can retry
        setSaveError(e instanceof Error ? e.message : 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่')
        store.refresh().catch(() => console.warn('Refresh failed after save'))
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [clients, navigate],
  )

  return (
    <div className="animate-fade-in pb-28">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 pt-8 md:px-6">
        <button type="button" className="v2-btn" onClick={() => navigate(editClient ? `/v2/c/${editClient.id}` : '/v2')}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          back
        </button>
        <p className="v2-eyebrow !mb-0">{editClient ? 'edit record' : 'new record'}</p>
      </div>

      {/* Suspense boundary: the form tree lazy-loads the map picker —
          without a boundary here, suspension escapes to the root. */}
      <Suspense fallback={null}>
        <InlineAddEditView
          editClient={editClient}
          clients={clients}
          onBack={() => navigate(editClient ? `/v2/c/${editClient.id}` : '/v2')}
          onSave={handleSave}
          uploading={uploading}
          uploadProgress={uploadProgress}
          error={saveError}
        />
      </Suspense>
    </div>
  )
}
