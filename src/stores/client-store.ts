
import { create } from 'zustand'
import type { Client } from '@/types/index'
import { fetchClients, fetchClientList, peekClientList, getDataReadState, subscribeDataReadState } from '@/lib/storage'
import { listItemToClient } from '@/lib/list-item'
import { isDemoMode } from '@/lib/demo'

interface ClientState {
  clients: Client[]
  totalCount: number
  displayLimit: number
  selectedIds: Set<string>
  selectionMode: boolean
  refreshing: boolean
  progress: number
  loading: boolean
  error: string | null
  initialized: boolean
  offline: boolean
  lastChecked: number
  setClients: (clients: Client[]) => void
  setTotalCount: (count: number) => void
  setDisplayLimit: (limit: number) => void
  incrementDisplayLimit: (step: number) => void
  setSelectedIds: (ids: Set<string>) => void
  toggleSelect: (id: string) => void
  toggleSelectAll: (allIds: string[]) => void
  clearSelection: () => void
  setSelectionMode: (mode: boolean) => void
  setRefreshing: (refreshing: boolean) => void
  setProgress: (progress: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateClient: (id: string, updates: Partial<Client>) => void
  addClient: (client: Client) => void
  removeClient: (id: string) => void
  initialize: () => Promise<void>
  refresh: () => Promise<Client[]>
}

let mutation = 0
let request = 0

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  totalCount: 0,
  displayLimit: 20,
  selectedIds: new Set(),
  selectionMode: false,
  refreshing: false,
  progress: 0,
  loading: true,
  error: null,
  initialized: false,
  offline: false,
  lastChecked: 0,

  setClients: (clients) => { mutation++; set({ clients, totalCount: clients.length }) },
  setTotalCount: (totalCount) => set({ totalCount }),
  setDisplayLimit: (displayLimit) => set({ displayLimit }),
  incrementDisplayLimit: (step) =>
    set((s) => ({ displayLimit: s.displayLimit + step })),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    }),
  toggleSelectAll: (allIds) =>
    set((s) => {
      if (s.selectedIds.size === allIds.length)
        return { selectedIds: new Set() }
      return { selectedIds: new Set(allIds) }
    }),
  clearSelection: () => set({ selectedIds: new Set(), selectionMode: false }),
  setSelectionMode: (selectionMode) => set({ selectionMode }),
  setRefreshing: (refreshing) => set({ refreshing }),
  setProgress: (progress) => set({ progress }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  updateClient: (id, updates) =>
    set((s) => {
      mutation++
      const next = s.clients.map((c) => (c.id === id ? { ...c, ...updates } : c))
      // Server sorts by updatedAt DESC — mirror that in the store so an
      // edited client surfaces at the top immediately, no refresh needed.
      return { clients: next.sort((a, b) => b.updatedAt - a.updatedAt) }
    }),
  addClient: (client) => {
    mutation++
    set((s) => { const clients = [client, ...s.clients.filter(c => c.id !== client.id)]; return { clients, totalCount: clients.length } })
  },
  removeClient: (id) => {
    mutation++
    set((s) => {
      const clients = s.clients.filter(c => c.id !== id)
      const selectedIds = new Set(s.selectedIds)
      selectedIds.delete(id)
      return { clients, totalCount: clients.length, selectedIds }
    })
  },

  initialize: async () => {
    if (get().initialized) return
    const started = mutation
    const sequence = ++request
    const current = () => started === mutation && sequence === request
    set({ initialized: true, loading: true, error: null })
    try {
      if (!isDemoMode()) {
        const cached = await peekClientList().catch(() => undefined)
        if (cached && current()) set({ clients: cached.map(listItemToClient), totalCount: cached.length, loading: false, ...getDataReadState() })
      }
      const items = await fetchClientList()
      if (current()) {
        // A successful catalog snapshot is authoritative, including empty.
        // Do not merge absent IDs back in or retain stale full fields.
        const clients = items.map(listItemToClient)
        const ids = new Set(clients.map(c => c.id))
        set({ clients, totalCount: clients.length, selectedIds: new Set([...get().selectedIds].filter(id => ids.has(id))), ...getDataReadState() })
      }
    } catch {
      if (current()) set({ error: 'Failed to load clients' })
    } finally {
      if (sequence === request) set({ loading: false })
    }
  },

  refresh: async () => {
    const started = mutation
    const sequence = ++request
    set({ refreshing: true, error: null })
    try {
      const data = await fetchClients()
      if (started === mutation && sequence === request) {
        const ids = new Set(data.map(c => c.id))
        set({ clients: data, totalCount: data.length, selectedIds: new Set([...get().selectedIds].filter(id => ids.has(id))), ...getDataReadState() })
      }
      return get().clients
    } catch (error) {
      if (started === mutation && sequence === request) set({ error: 'Failed to refresh clients' })
      throw error
    } finally {
      if (sequence === request) set({ refreshing: false, loading: false })
    }
  },
}))

subscribeDataReadState(() => useClientStore.setState(getDataReadState()))
