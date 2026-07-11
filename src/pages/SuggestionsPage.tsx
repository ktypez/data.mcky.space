'use client'

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import AdminSuggestionsInline from '@/components/AdminSuggestionsInline'

export default function SuggestionsPage() {
  const navigate = useNavigate()
  const { initialize } = useClientStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSuggestionsInline onClose={() => navigate('/')} />
    </div>
  )
}
