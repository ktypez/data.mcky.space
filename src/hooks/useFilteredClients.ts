import { useEffect, useMemo } from 'react'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { useDebounce } from './useDebounce'
import { FilterKey, type Client } from '@/types'

/** How many rows to show per "load more" step. */
export const DISPLAY_STEP = 20

/**
 * Filter, count, and paginate the client list.
 *
 * Owns all the "given clients + search + filter + cutoff, what's visible"
 * logic so `Clients.tsx` can stay a wiring shell. Also resets the
 * display limit when search/filter change so the user doesn't end up
 * on row 380 of a stale query.
 */
export function useFilteredClients() {
  const clients = useClientStore((s) => s.clients)
  const displayLimit = useClientStore((s) => s.displayLimit)
  const { search, filter, recentCutoff } = useFilterStore()
  const debouncedSearch = useDebounce(search, 50)
  const query = debouncedSearch.trim().toLowerCase()

  const counts = useMemo(() => {
    const total = clients.length
    let withImages = 0
    let recent = 0
    let penpay = 0
    for (const c of clients) {
      if (c.images.length > 0) withImages++
      if (c.createdAt > recentCutoff) recent++
      if (c.badge === 'penpay') penpay++
    }
    return { total, withImages, noImages: total - withImages, recent, penpay }
  }, [clients, recentCutoff])

  const filtered = useMemo<Client[]>(() => {
    let result = clients
    if (query) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.shopName.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query),
      )
    }
    switch (filter) {
      case FilterKey.WithImages:
        result = result.filter((c) => c.images.length > 0)
        break
      case FilterKey.NoImages:
        result = result.filter((c) => c.images.length === 0)
        break
      case FilterKey.Recent:
        result = result.filter((c) => c.createdAt > recentCutoff)
        break
      case FilterKey.Penpay:
        result = result.filter((c) => c.badge === 'penpay')
        break
    }
    return result
  }, [clients, query, filter, recentCutoff])

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
