
import { create } from './create-store'
import { FilterKey, type ViewMode } from '@/types/index'

const DAYS_KEY = 'ledger-recent-days'
const clampDays = (n: number) => Math.min(120, Math.max(7, Math.round(n) || 7))
function readDays(): number {
  try {
    return clampDays(Number(localStorage.getItem(DAYS_KEY) ?? 7))
  } catch {
    return 7
  }
}
const initialDays = readDays()

interface FilterState {
  recentDays: number
  setRecentDays: (days: number) => void
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
  recentDays: initialDays,
  setRecentDays: (days) => {
    const next = clampDays(days)
    try {
      localStorage.setItem(DAYS_KEY, String(next))
    } catch {
      /* storage unavailable */
    }
    set({ recentDays: next, recentCutoff: Date.now() - next * 86400000 })
  },
  recentCutoff: Date.now() - initialDays * 86400000,
  setSearch: (search) => set({ search }),
  setFilter: (filter) => set({ filter }),
  setViewMode: (viewMode) => set({ viewMode }),
  setRecentCutoff: (recentCutoff) => set({ recentCutoff }),
}))
