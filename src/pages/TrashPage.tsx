
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import TrashView from '@/components/TrashView'

export default function TrashPage() {
  const { initialize } = useClientStore()
  const navigate = useNavigate()

  useEffect(() => {
    initialize()
  }, [initialize])

  return <TrashView onClose={() => navigate('/')} />
}
