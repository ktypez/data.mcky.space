
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import TrashView from '@/components/TrashView'
import PageHeader from '@/components/PageHeader'

export default function TrashPage() {
  const navigate = useNavigate()
  const { initialize } = useClientStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        variant="add-edit"
        title="ถังขยะ"
        showBack
        onBack={() => navigate('/')}
      />
      <TrashView />
    </div>
  )
}
