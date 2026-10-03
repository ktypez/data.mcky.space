import { useDeferredValue, useMemo } from 'react'
import { useClientStore } from '@/stores/client-store'
import { useFilterStore } from '@/stores/filter-store'
import { applyCounts, applyFilter, sortByCreatedDesc } from '@/lib/filter'

/** Filter and count the complete client list for virtualized rendering. */
export function useFilteredClients(options?: { newestCreatedFirst?: boolean }) {
  const newestCreatedFirst = options?.newestCreatedFirst ?? false
  const clients = useClientStore((state) => state.clients)
  const { search, filter, recentCutoff } = useFilterStore()
  const deferredSearch = useDeferredValue(search)
  const query = deferredSearch.trim().toLowerCase()

  const counts = useMemo(
    () => applyCounts(clients, recentCutoff),
    [clients, recentCutoff],
  )

  const filtered = useMemo(() => {
    const result = applyFilter(clients, query, filter, recentCutoff)
    return newestCreatedFirst ? sortByCreatedDesc(result) : result
  }, [clients, query, filter, recentCutoff, newestCreatedFirst])

  return { counts, filtered }
}
