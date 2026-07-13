'use client'

import { create } from 'zustand'
import type { Client } from '@/types'
import { fetchClients } from '@/lib/storage'
import { getAllClients } from '@/lib/offline-db'

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
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  addClient: (client) =>
    set((s) => ({ clients: [client, ...s.clients] })),
  removeClient: (id) =>
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
    })),

  initialize: async () => {
    if (get().initialized) return
    set({ loading: true, error: null })
    // D1 is the source of truth. Load the full list ONCE per app session
    // (guarded by `initialized`) so search/filter work on complete data
    // without hammering Cloudflare Pages on every navigation.
    // IndexedDB is only a fallback for when the network is fully down.
    try {
      const data = await fetchClients()
      set({ clients: data, loading: false, initialized: true })
      return
    } catch {
      try {
        const idb = await getAllClients()
        if (idb.length > 0) {
          const sorted = (idb as unknown as Client[]).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          )
          set({ clients: sorted, loading: false, initialized: true })
          return
        }
      } catch {}
      set({ error: 'Failed to load clients', loading: false, initialized: true })
    }
  },

  initializeLegacy: async () => {
    if (get().initialized) return
    set({ loading: true, error: null })
    // D1 is the source of truth. We no longer trust a stale IndexedDB cache as
    // the displayed list, because a cached client set missing a freshly-added
    // client would make new entries "disappear after refresh".
    // Strategy: try D1 first; on success overwrite everything (incl. cache).
    // Only fall back to a stale IndexedDB snapshot if the network fully fails.
    try {
      const data = await fetchClients()
      set({ clients: data, loading: false, initialized: true })
      return
    } catch {
      // network/D1 failed — fall back to whatever is in IndexedDB
      try {
        const idb = await getAllClients()
        if (idb.length > 0) {
          const sorted = (idb as unknown as Client[]).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          )
          set({ clients: sorted, loading: false, initialized: true })
          return
        }
      } catch {}
      set({ error: 'Failed to load clients', loading: false, initialized: true })
    }
  },

  refresh: async () => {
    set({ refreshing: true, error: null })
    try {
      const data = await fetchClients()
      set({ clients: data, refreshing: false })
      return data
    } catch (e) {
      set({ error: 'Failed to refresh clients', refreshing: false })
      throw e
    }
  },
}))
