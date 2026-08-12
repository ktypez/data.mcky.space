
import { useEffect } from 'react'
import { useClientStore } from '@/stores/client-store'
import TrashView from '@/components/TrashView'

export default function TrashPage() {
  const { initialize } = useClientStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return <TrashView />
}
