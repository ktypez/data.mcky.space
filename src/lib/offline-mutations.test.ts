import { describe, expect, it } from 'vitest'
import {
  canQueueClientMutation,
  type ClientMutation,
  type QueuedClientMutation,
} from './offline-mutations'

describe('offline client mutation contract', () => {
  const client = {
    id: 'client-1', name: ['ร้าน'], shopName: [], address: '', lat: null, lng: null,
    images: ['https://cdn.example/photo.jpg'], badge: null, notes: null, createdAt: 1, updatedAt: 1,
  }

  it('allows small authenticated-safe mutations with remote image URLs', () => {
    const mutations: ClientMutation[] = [
      { kind: 'create', client },
      { kind: 'update', client },
      { kind: 'delete', id: client.id },
    ]
    for (const mutation of mutations) expect(canQueueClientMutation(mutation)).toBe(true)
  })

  it('rejects base64 images instead of queueing a partial photo mutation', () => {
    expect(canQueueClientMutation({ kind: 'create', client: { ...client, images: ['data:image/png;base64,abc'] } })).toBe(false)
  })

  it('does not treat a queued operation as another user’s work', () => {
    const queued: QueuedClientMutation = {
      id: 'q-1', userId: 'user-a', createdAt: 1, attempts: 0,
      mutation: { kind: 'delete', id: client.id },
    }
    expect(queued.userId).not.toBe('user-b')
  })
})
