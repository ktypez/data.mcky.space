import { useEffect, useMemo } from 'react'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useDebounce } from './useDebounce'
import { applyCounts, applyFilter } from '@/lib/filter'

/** How many rows to show per "load more" step. */
export const DISPLAY_STEP = 20

/**
 * Filter, count, and paginate the client list.
 *
 * Owns all the "given clients + search + filter + cutoff, what's visible"
 * logic so `Clients.tsx` can stay a wiring shell. The actual filter and
 * count functions live in `lib/filter.ts` so they're pure + unit-tested.
 * Also resets the display limit when search/filter change so the user
 * doesn't end up on row 380 of a stale query.
 */
export function useFilteredClients() {
  const clients = useClientStore((s) => s.clients)
  const displayLimit = useClientStore((s) => s.displayLimit)
  const { search, filter, recentCutoff } = useFilterStore()
  const debouncedSearch = useDebounce(search, 200)
  const query = debouncedSearch.trim().toLowerCase()

  const counts = useMemo(
    () => applyCounts(clients, recentCutoff),
    [clients, recentCutoff],
  )

  const filtered = useMemo(
    () => applyFilter(clients, query, filter, recentCutoff),
    [clients, query, filter, recentCutoff],
  )

  const displayed = useMemo(
    () => filtered.slice(0, displayLimit),
    [filtered, displayLimit],
  )
  const hasMore = displayLimit < filtered.length

  // Reset the window whenever the user changes what they're looking at.
  // Skipped on mount because displayLimit starts at DISPLAY_STEP anyway.
  useEffect(() => {
    useClientStore.getState().setDisplayLimit(DISPLAY_STEP)
  }, [debouncedSearch, filter])

  return { counts, filtered, displayed, hasMore, displayLimit }
}
