import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Client, ClientListItem } from '@/types'
const reads = vi.hoisted(() => ({ list: vi.fn(), full: vi.fn(), peek: vi.fn() }))
vi.mock('./storage', () => ({ fetchClientList: reads.list, fetchClients: reads.full, peekClientList: reads.peek, getDataReadState: () => ({ offline: false, lastChecked: 123 }), subscribeDataReadState: () => () => {} }))
const row = { id: 'a', name: ['a'], shopName: [], branch: '', image: null, thumb: null, badge: null, hasNotes: false, createdAt: 1, updatedAt: 1 } satisfies ClientListItem
const client = { ...row, address: 'full', images: [], lat: null, lng: null, notes: null } satisfies Client
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); reads.peek.mockResolvedValue(undefined) })
describe('catalog store reconciliation', () => {
  it('always settles loading after cold initialize and removes absent cached rows', async () => {
    const { useClientStore: store } = await import('@/stores/client-store')
    store.setState({ clients: [client] })
    reads.list.mockResolvedValue([])
    await store.getState().initialize()
    await vi.waitFor(() => expect(store.getState().loading).toBe(false))
    expect(store.getState().clients).toEqual([])
    expect(store.getState().totalCount).toBe(0)
  })
  it('settles failed initialize with an error rather than an endless spinner', async () => {
    const { useClientStore: store } = await import('@/stores/client-store')
    reads.list.mockRejectedValue(new Error('offline'))
    await store.getState().initialize()
    await vi.waitFor(() => expect(store.getState().loading).toBe(false))
    expect(store.getState().error).toBeTruthy()
  })
  it('upserts full records and clears stale list thumbnails', async () => {
    const { useClientStore: store } = await import('@/stores/client-store')
    store.setState({ clients: [{ ...client, thumb: 'https://example.test/old.jpg' }] })
    store.getState().upsertClient({ ...client, address: 'updated' })
    expect(store.getState().clients[0]).toMatchObject({ address: 'updated', thumb: null })

    store.getState().upsertClient({ ...client, id: 'b' })
    expect(store.getState().clients.map(item => item.id)).toContain('b')
  })

  it('does not resurrect a local deletion from an in-flight refresh', async () => {
    const { useClientStore: store } = await import('@/stores/client-store')
    let resolve!: (clients: Client[]) => void
    reads.full.mockImplementation(() => new Promise(r => { resolve = r }))
    store.setState({ clients: [client] })
    const pending = store.getState().refresh()
    store.getState().removeClient('a')
    resolve([client])
    await pending
    expect(store.getState().clients).toEqual([])
    expect(store.getState().refreshing).toBe(false)
  })
})
