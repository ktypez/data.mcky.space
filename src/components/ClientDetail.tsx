
import { useState, useCallback } from 'react'
import type { Client } from '@/types'
import MapPreview from '@/components/MapPreviewDynamic'
import AddClientForm from '@/components/AddClientForm'
import { deleteClient } from '@/lib/storage'
import { copyToClipboard, getMapsUrl, hasValidCoords } from '@/lib/utils'
import Lightbox from '@/components/Lightbox'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import ClientInfoCard from './ClientInfoCard'
import ClientPhotoGallery from './ClientPhotoGallery'
import ClientNotesCard from './ClientNotesCard'
import ClientShareCard from './ClientShareCard'
import ClientDateCard from './ClientDateCard'
import ClientActionButtons from './ClientActionButtons'

interface Props {
 client: Client
 isAdmin: boolean
 clients: Client[]
 onClientUpdated: (client: Client) => void
 onClientDeleted: (id: string) => void
 hideActions?: boolean
 uploading?: boolean
 uploadProgress?: number
}

export default function ClientDetail({
 client,
 isAdmin,
 clients,
 onClientUpdated,
 onClientDeleted,
 hideActions,
 uploading,
 uploadProgress,
}: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const imgs = client.images ?? []

  const [editOpen, setEditOpen] = useState(false)
 const [deleteConfirm, setDeleteConfirm] = useState(false)
 const [copied, setCopied] = useState<string | null>(null)
 const [showMapConfirm, setShowMapConfirm] = useState(false)

  const openMapApp = useCallback(() => {
  if (!client.lat || !client.lng) return
  window.location.href = `https://maps.google.com/?q=${client.lat},${client.lng}`
  }, [client.lat, client.lng])

  const handleCopy = useCallback((mode: 'text' | 'maps' | 'text+maps' = 'text') => {
    const parts: string[] = []
    if (mode !== 'maps') {
      parts.push(`👤 : ${client.name}`)
      if (client.shopName) parts.push(`🏠 : ${client.shopName}`)
      if (client.address) parts.push(`📌 : ${client.address}`)
    }
    let text = parts.join('\n')
    if (mode === 'maps' || mode === 'text+maps') {
      if (!client.lat || !client.lng) return
      const url = getMapsUrl(client.lat, client.lng)
      const mapsText = `🗺️ : ${url}`
      text = mode === 'maps' ? mapsText : text + '\n' + mapsText
    }
    copyToClipboard(text).then((ok) => {
      if (!ok) return
      setCopied(mode)
      setTimeout(() => setCopied(null), 1500)
    })
  }, [client])

 const handleDelete = useCallback(() => {
 const deletedClient = client
 onClientDeleted(client.id)
 deleteClient(deletedClient.id).catch(() => {
 onClientUpdated(deletedClient)
 })
 }, [client, onClientDeleted, onClientUpdated])

 const handleEditSave = useCallback(
  (data: Omit<Client, 'createdAt' | 'updatedAt'>) => {
  const updated: Client = { ...client, ...data, updatedAt: Date.now() }
  onClientUpdated(updated)
  setEditOpen(false)
  },
  [client, onClientUpdated],
  )

  if (editOpen) {
  return (
  <div className="flex-1 min-w-0 flex flex-col">
   <div className="flex-1 overflow-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
   <Card>
    <CardContent className="px-3 py-2">
     <h2 className="text-base font-bold text-foreground mb-3">
      แก้ไขข้อมูลลูกค้า
     </h2>
    <AddClientForm
      open={editOpen}
      onOpenChange={setEditOpen}
      onSave={handleEditSave}
      editClient={client}
      existingClients={clients}
      variant="inline"
      uploading={uploading}
      uploadProgress={uploadProgress}
    />
   </CardContent>
  </Card>
 </div>
 </div>
 )
 }

 return (
 <div className="flex-1 min-w-0 flex flex-col">
 {/* ── BODY ── */}
 <div className="flex-1 overflow-auto p-4 md:p-6 space-y-2 max-w-4xl mx-auto w-full">
  {/* ── CLIENT INFO CARD ── */}
  <ClientInfoCard client={client} copied={copied} onCopy={handleCopy} />

  <ClientNotesCard notes={client.notes} />

  {/* ── PHOTOS + MAP (side-by-side on desktop) ── */}
 <div className="flex flex-row gap-2">
  {client.images?.length > 0 && (
    <ClientPhotoGallery
      images={client.images}
      onLightboxOpen={(i) => setLightboxIdx(i)}
    />
  )}

  {hasValidCoords(client.lat, client.lng) && (
  <div
    onClick={() => setShowMapConfirm(true)}
    className="flex-1 aspect-square md:aspect-[2/1] rounded-[10px] overflow-hidden relative flex flex-col cursor-pointer"
   >
  <MapPreview lat={client.lat} lng={client.lng} />
  <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium bg-foreground/80 text-white pointer-events-none">
 <ArrowSquareOut className="w-3 h-3" />
 เปิดแผนที่
 </div>
 </div>
 )}
 </div>

  <ClientShareCard clientId={client.id} />
  <ClientDateCard createdAt={client.createdAt} updatedAt={client.updatedAt} />

  <ClientActionButtons
    isAdmin={isAdmin}
    hideActions={hideActions}
    onEdit={() => setEditOpen(true)}
    onDelete={() => setDeleteConfirm(true)}
  />
 </div>
 {/* ── DELETE CONFIRM ── */}
 <ConfirmDialog
  open={deleteConfirm}
  onOpenChange={setDeleteConfirm}
  title="ยืนยันลบข้อมูลลูกค้านี้?"
  description={client.shopName || client.name}
  confirmLabel="ลบ"
  variant="danger"
  onConfirm={handleDelete}
 />

 {/* ── MAP CONFIRM ── */}
 <ConfirmDialog
  open={showMapConfirm}
  onOpenChange={setShowMapConfirm}
  title={`นำทางไปยัง ${client.shopName || client.name}?`}
  description="เปิดแผนที่เพื่อนำทาง"
  confirmLabel="เปิดแผนที่"
  variant="default"
  onConfirm={() => { openMapApp(); setShowMapConfirm(false) }}
 />

  {/* ── LIGHTBOX ── */}
  {lightboxIdx != null && imgs.length > 0 && (
    <Lightbox
      images={imgs}
      index={lightboxIdx}
      onClose={() => setLightboxIdx(null)}
      onIndexChange={setLightboxIdx}
    />
  )}
  </div>
  )
}
