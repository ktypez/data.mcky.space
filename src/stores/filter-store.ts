'use client'

import { create } from 'zustand'
import { FilterKey, type ViewMode } from '@/types'

interface FilterState {
  search: string
  filter: FilterKey
  viewMode: ViewMode
  recentCutoff: number
  setSearch: (search: string) => void
  setFilter: (filter: FilterKey) => void
  setViewMode: (viewMode: ViewMode) => void
  setRecentCutoff: (cutoff: number) => void
}

export const useFilterStore = create<FilterState>((set) => ({
  search: '',
  filter: FilterKey.All,
  viewMode: 'table',
  recentCutoff: Date.now() - 7 * 86400000,
  setSearch: (search) => set({ search }),
  setFilter: (filter) => set({ filter }),
  setViewMode: (viewMode) => set({ viewMode }),
  setRecentCutoff: (recentCutoff) => set({ recentCutoff }),
}))
