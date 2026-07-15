'use client'

import { create } from 'zustand'

interface SuggestionState {
  pendingIds: Set<string>
  refreshKey: number
  setPendingIds: (ids: Set<string>) => void
  incrementRefresh: () => void
}

export const useSuggestionStore = create<SuggestionState>((set) => ({
  pendingIds: new Set(),
  refreshKey: 0,
  setPendingIds: (pendingIds) => set({ pendingIds }),
  incrementRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}))
