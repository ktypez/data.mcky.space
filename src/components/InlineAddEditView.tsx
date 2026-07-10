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
  isAdmin: boolean
  onHome: () => void
  onMap: () => void
  onSuggestions?: () => void
  onTrash?: () => void
  onLogout: () => void
  onLoginOpen: () => void
}

export default function InlineAddEditView({
  editClient,
  clients,
  onBack,
  onSave,
  isAdmin,
  onHome,
  onMap,
  onSuggestions,
  onTrash,
  onLogout,
  onLoginOpen,
}: InlineAddEditViewProps) {
  return (
    <>
      <PageHeader
        variant="add-edit"
        title={editClient ? editClient.shopName || editClient.name : 'เพิ่มลูกค้าใหม่'}
        showBack
        onBack={onBack}
        isAdmin={isAdmin}
        onHome={onHome}
        onMap={onMap}
        onSuggestions={onSuggestions}
        onTrash={onTrash}
        onLogout={onLogout}
        onLoginOpen={onLoginOpen}
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
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
