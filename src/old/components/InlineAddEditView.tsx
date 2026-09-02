
import type { Client } from '@/types/index'
import AddClientForm from '@/old/components/AddClientForm'
import { Card, CardContent } from '@/old/components/ui/card'

interface InlineAddEditViewProps {
  editClient: Client | null
  clients: Client[]
  onBack: () => void
  onSave: (data: Omit<Client, 'createdAt' | 'updatedAt'>) => void
  uploading?: boolean
  uploadProgress?: number
  error?: string | null
}

export default function InlineAddEditView({
  editClient,
  clients,
  onBack,
  onSave,
  uploading,
  uploadProgress,
  error,
}: InlineAddEditViewProps) {
  return (
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
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  )
}
