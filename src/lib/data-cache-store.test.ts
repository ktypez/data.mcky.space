import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Client, ClientListItem } from '@/types'
const reads = vi.hoisted(() => ({ list: vi.fn(), full: vi.fn(), peek: vi.fn() }))
vi.mock('./storage', () => ({ fetchClientList: reads.list, fetchClients: reads.full, peekClientList: reads.peek, getDataReadState: () => ({ offline: false, lastChecked: 123 }), subscribeDataReadState: () => () => {} }))
vi.mock('./demo', () => ({ isDemoMode: () => false }))
const row = { id: 'a', name: ['a'], shopName: [], image: null, thumb: null, badge: null, createdAt: 1, updatedAt: 1 } satisfies ClientListItem
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
