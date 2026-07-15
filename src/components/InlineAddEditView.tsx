'use client'

import type { Client } from '@/types'
import AddClientForm from '@/components/AddClientForm'
import PageHeader from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

interface InlineAddEditViewProps {
  editClient: Client | null
  clients: Client[]
  onBack: () => void
  onSave: (data: Omit<Client, 'createdAt' | 'updatedAt'>) => void
  uploading?: boolean
  uploadProgress?: number
}

export default function InlineAddEditView({
  editClient,
  clients,
  onBack,
  onSave,
  uploading,
  uploadProgress,
}: InlineAddEditViewProps) {
  return (
    <>
      <PageHeader
        variant="add-edit"
        title={editClient ? editClient.shopName || editClient.name : 'เพิ่มลูกค้าใหม่'}
        showBack
        onBack={onBack}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
        <Card>
          <CardContent className="px-3 py-2">
            <AddClientForm
              key={editClient?.id ?? 'new'}
              open={true}
              onOpenChange={onBack}
              onSave={onSave}
              editClient={editClient ?? undefined}
              existingClients={clients}
              variant="inline"
              uploading={uploading}
              uploadProgress={uploadProgress}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
