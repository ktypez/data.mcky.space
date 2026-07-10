'use client'

import { create } from 'zustand'
import type { PendingSuggestion } from '@/types'

interface SuggestionState {
  pendingIds: Set<string>
  refreshKey: number
  suggestions: PendingSuggestion[]
  loading: boolean
  setPendingIds: (ids: Set<string>) => void
  incrementRefresh: () => void
  setSuggestions: (suggestions: PendingSuggestion[]) => void
  setLoading: (loading: boolean) => void
}

export const useSuggestionStore = create<SuggestionState>((set) => ({
  pendingIds: new Set(),
  refreshKey: 0,
  suggestions: [],
  loading: false,
  setPendingIds: (pendingIds) => set({ pendingIds }),
  incrementRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  setSuggestions: (suggestions) => set({ suggestions }),
  setLoading: (loading) => set({ loading }),
}))
