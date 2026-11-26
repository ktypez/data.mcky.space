import type { Client } from '@/types'
import {
  listQueuedMutations,
  newQueuedMutation,
  putQueuedMutation,
  removeQueuedMutation,
} from './offline-db'
import { treatyClient, treatyHeaders } from './treaty'

export type ClientMutation =
  | { kind: 'create' | 'update'; client: Client }
  | { kind: 'delete'; id: string }

export type QueuedClientMutation = {
  id: string
  userId: string
  createdAt: number
  attempts: number
  lastError?: string
  mutation: ClientMutation
}

export function canQueueClientMutation(mutation: ClientMutation): boolean {
  if (mutation.kind === 'delete') return mutation.id.trim().length > 0
  return mutation.client.images.every(image => !image.startsWith('data:'))
}

export function mutationKey(mutation: ClientMutation): string {
  return mutation.kind === 'delete' ? mutation.id : mutation.client.id
}

export function coalesceMutations(items: QueuedClientMutation[]): QueuedClientMutation[] {
  const latest = new Map<string, QueuedClientMutation>()
  for (const item of items) {
    const key = mutationKey(item.mutation)
    const previous = latest.get(key)
    if (previous?.mutation.kind === 'create' && item.mutation.kind === 'delete') {
      latest.delete(key)
      continue
    }
    latest.set(key, item)
  }
  return [...latest.values()].sort((a, b) => a.createdAt - b.createdAt)
}

export async function enqueueClientMutation(userId: string, mutation: ClientMutation): Promise<QueuedClientMutation> {
  if (!userId || !canQueueClientMutation(mutation)) throw new Error('Mutation cannot be queued offline')
  const item = newQueuedMutation(userId, mutation)
  await putQueuedMutation(item)
  return item
}

async function send(item: QueuedClientMutation): Promise<void> {
  const headers = await treatyHeaders(item.id)
  if (!headers.Authorization) throw new Error('Authentication required to sync offline changes')
  const { mutation } = item
  if (mutation.kind === 'delete') {
    const { error } = await treatyClient.api.clients({ id: mutation.id }).delete(undefined, { headers })
    if (error) throw new Error('Failed to sync delete')
    return
  }
  const body = {
    id: mutation.client.id,
    name: mutation.client.name,
    shopName: mutation.client.shopName,
    branch: mutation.client.branch,
    address: mutation.client.address,
    lat: mutation.client.lat,
    lng: mutation.client.lng,
    images: mutation.client.images,
    badge: mutation.client.badge,
    notes: mutation.client.notes,
  }
  if (mutation.kind === 'create') {
    const { error } = await treatyClient.api.clients.post(body as never, { headers })
    if (error) throw new Error('Failed to sync create')
  } else {
    const { error } = await treatyClient.api.clients({ id: mutation.client.id }).put(body as never, { headers })
    if (error) throw new Error('Failed to sync update')
  }
}

export async function flushClientMutations(userId: string): Promise<{ synced: number; failed: number }> {
  if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) return { synced: 0, failed: 0 }
  const queued = await listQueuedMutations(userId)
  const coalesced = coalesceMutations(queued)
  const kept = new Set(coalesced.map(item => item.id))
  await Promise.all(queued.filter(item => !kept.has(item.id)).map(item => removeQueuedMutation(item.id)))
  let synced = 0
  let failed = 0
  for (const item of coalesced) {
    try {
      await send(item)
      await removeQueuedMutation(item.id)
      synced++
    } catch (error) {
      failed++
      await putQueuedMutation({ ...item, attempts: item.attempts + 1, lastError: error instanceof Error ? error.message : 'Sync failed' })
      break
    }
  }
  return { synced, failed }
}
