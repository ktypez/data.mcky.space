import type { Client } from '@/types'
import { getAllClients, putClient, putClients, deleteClient as deleteClientFromDb } from '@/lib/offline-db'
import { apiFetch } from '@/lib/api'

function toRaw(c: Client): Record<string, unknown> {
  return c as unknown as Record<string, unknown>
}

export async function fetchClients(limit?: number): Promise<Client[]> {
  let url: string
  if (limit === 0) {
    url = '/api/clients?limit=all'
  } else if (limit) {
    url = `/api/clients?limit=${limit}`
  } else {
    url = '/api/clients'
  }
  const res = await apiFetch(url)
  if (!res.ok) {
    const idb = await getAllClients()
    if (idb.length > 0) return idb as unknown as Client[]
    throw new Error('Failed to fetch clients')
  }
  const fresh = (await res.json()) as Client[]
  await putClients(fresh.map(toRaw))
  return fresh
}

export async function addClient(client: Client): Promise<Client> {
  await putClient(toRaw(client))
  const res = await apiFetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(client),
  })
  if (!res.ok) throw new Error('Failed to add client')
  return (await res.json()) as Client
}

export async function updateClient(client: Client): Promise<Client> {
  await putClient(toRaw(client))
  const res = await apiFetch(`/api/clients/${client.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(client),
  })
  if (!res.ok) throw new Error('Failed to update client')
  return (await res.json()) as Client
}

export async function deleteClient(id: string): Promise<void> {
  await deleteClientFromDb(id)
  const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete client')
}
