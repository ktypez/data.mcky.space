'use client'

import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import { fetchClients } from '@/lib/storage'
import AdminSuggestionsInline from '@/components/AdminSuggestionsInline'

export default function SuggestionsPage() {
  const navigate = useNavigate()
  const cliStore = useClientStore()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    cliStore.initialize()
  }, [])

  useEffect(() => {
    if (refreshKey === 0) return
    fetchClients()
      .then((data) => cliStore.setClients(data))
      .catch(() => {})
  }, [refreshKey])

  const onAction = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSuggestionsInline onClose={() => navigate('/')} onAction={onAction} />
    </div>
  )
}
