
import { create } from 'zustand'
import type { Client } from '@/types/index'
import { fetchClients } from '@/lib/storage'
import { getAllClients, purgeExpiredClients } from '@/lib/offline-db'
import { normalizeClients } from '@/lib/clientNames'

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

  setClients: (clients) => set({ clients }),
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
      const next = s.clients.map((c) => (c.id === id ? { ...c, ...updates } : c))
      // Server sorts by updatedAt DESC — mirror that in the store so an
      // edited client surfaces at the top immediately, no refresh needed.
      return { clients: next.sort((a, b) => b.updatedAt - a.updatedAt) }
    }),
  addClient: (client) =>
    set((s) => ({ clients: [client, ...s.clients] })),
  removeClient: (id) =>
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
    })),

  initialize: async () => {
    if (get().initialized) return
    // Claim `initialized` BEFORE the fetch (not after) so a slow first load
    // can't stomp clients that were added/edited while the fetch was in
    // flight — the fetch result is merged below with "newer wins" semantics.
    set({ initialized: true, loading: true, error: null })
    try {
      const data = await fetchClients()
      set((s) => {
        // Merge: server data is the baseline, but any client mutated into
        // the store during flight (added via AddEditPage) is kept, and the
        // newer copy wins when both exist. Keeps the list newest-first.
        const byId = new Map<string, Client>()
        for (const c of data) byId.set(c.id, c)
        for (const c of s.clients) {
          const existing = byId.get(c.id)
          if (!existing || c.updatedAt > existing.updatedAt) byId.set(c.id, c)
        }
        const merged = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
        return { clients: merged, loading: false }
      })
    } catch {
      try {
        const idb = await getAllClients()
        if (idb.length > 0) {
          const sorted = normalizeClients(idb).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          )
          set({ clients: sorted, loading: false, initialized: true })
          return
        }
      } catch (idbErr) {
        console.error('IDB fallback failed:', idbErr)
      }
      set({ error: 'Failed to load clients', loading: false, initialized: true })
      return
    }
    // M4 fix: after a successful refresh, opportunistically purge expired
    // IDB entries. Cheap, runs once per app init, prevents unbounded growth.
    purgeExpiredClients().catch(() => {
      // non-fatal
    })
  },

  refresh: async () => {
    set({ refreshing: true, error: null })
    try {
      const data = await fetchClients()
      set({ clients: data, refreshing: false })
      return data
    } catch (e) {
      // M2 fix: fall back to IndexedDB cache when the network is down,
      // matching the behavior of `initialize()`. Without this, the
      // pull-to-refresh gesture would just throw and leave the user
      // with a stale empty list.
      try {
        const idb = await getAllClients()
        if (idb.length > 0) {
          const sorted = normalizeClients(idb).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          )
          set({ clients: sorted, refreshing: false })
          return sorted
        }
      } catch {
        // IDB also failed — propagate the original error
      }
      set({ error: 'Failed to refresh clients', refreshing: false })
      throw e
    }
  },
}))
