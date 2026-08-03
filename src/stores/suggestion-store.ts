
import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

interface SuggestionState {
  pendingIds: Set<string>
  refreshKey: number
  setPendingIds: (ids: Set<string>) => void
  incrementRefresh: () => void
  /**
   * Fetch the set of client IDs that have a pending suggestion.
   * Stored here (not in `Clients.tsx`) so the URL + auth header
   * stay colocated with the rest of the suggestion domain.
   */
  refreshPendingIds: () => Promise<void>
}

export const useSuggestionStore = create<SuggestionState>((set) => ({
  pendingIds: new Set(),
  refreshKey: 0,
  setPendingIds: (pendingIds) => set({ pendingIds }),
  incrementRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  refreshPendingIds: async () => {
    try {
      const r = await apiFetch('/api/suggestions?mode=pending-client-ids')
      const data = (await r.json()) as string[]
      useSuggestionStore.setState({ pendingIds: new Set(data) })
    } catch (e) {
      console.warn('Failed to fetch pending suggestions', e)
    }
  },
}))
