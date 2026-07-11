'use client'

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import TrashView from '@/components/TrashView'

export default function TrashPage() {
  const navigate = useNavigate()
  const { initialize } = useClientStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="flex min-h-screen bg-background">
      <TrashView onClose={() => navigate('/')} />
    </div>
  )
}
