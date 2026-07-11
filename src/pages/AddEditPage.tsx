'use client'

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { addClient, fetchClients, updateClient } from '@/lib/storage'
import type { Client } from '@/types'
import InlineAddEditView from '@/components/InlineAddEditView'

export default function AddEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { clients, initialize } = useClientStore()
  const cliStore = useClientStore()
  const { isAdmin } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  const editClient: Client | null =
    id ? clients.find((c) => c.id === id) ?? null : null

  const handleSave = useCallback(
    async (data: Omit<Client, 'createdAt' | 'updatedAt'>) => {
      const existing = clients.find((c) => c.id === data.id)
      try {
        if (existing) {
          const updated: Client = {
            ...data,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
          }
          const saved = await updateClient(updated)
          cliStore.updateClient(saved.id, saved)
        } else {
          const nc: Client = {
            ...data,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          const saved = await addClient(nc)
          cliStore.addClient(saved)
        }
        navigate('/')
      } catch {
        fetchClients()
          .then((data) => cliStore.setClients(data))
          .catch(() => {})
      }
    },
    [clients, navigate],
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InlineAddEditView
        editClient={editClient}
        clients={clients}
        onBack={() => navigate('/')}
        onSave={handleSave}
      />
    </div>
  )
}
