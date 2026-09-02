import { FilterKey, type Client } from '@/types/index'
import { clientMatchesQuery } from '@/lib/clientNames'

/**
 * Counts for the filter chips shown in `SelectionToolbar`.
 * Single pass over the list — `O(n)` in clients, no deps on filter.
 */
export function applyCounts(
  clients: Client[],
  recentCutoff: number,
): {
  total: number
  withImages: number
  noImages: number
  recent: number
  penpay: number
  credit: number
} {
  const total = clients.length
  let withImages = 0
  let recent = 0
  let penpay = 0
  let credit = 0
  for (const c of clients) {
    if (c.images.length > 0) withImages++
    if (c.createdAt > recentCutoff) recent++
    if (c.badge === 'penpay') penpay++
    if (c.badge === 'credit') credit++
  }
  return { total, withImages, noImages: total - withImages, recent, penpay, credit }
}

/**
 * Newest-created first. Ignores `updatedAt` on purpose: an old entry that
 * gets a typo fix should not jump to the top of the list. Pure + tested.
 */
export function sortByCreatedDesc(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Apply a search query and a filter key to the client list.
 * Pure — does not depend on React, stores, or time. Safe to unit test.
 *
 * - `query` is already lowercased + trimmed by the caller
 * - matches on name, shopName, address, or id
 * - `FilterKey.All` returns the search result untouched
 */
export function applyFilter(
  clients: Client[],
  query: string,
  filter: FilterKey,
  recentCutoff: number,
): Client[] {
  let result = clients
  if (query) {
    result = result.filter(
      (c) =>
        clientMatchesQuery(c, query) ||
        c.address.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query),
    )
  }
  switch (filter) {
    case FilterKey.WithImages:
      return result.filter((c) => c.images.length > 0)
    case FilterKey.NoImages:
      return result.filter((c) => c.images.length === 0)
    case FilterKey.Recent:
      return result.filter((c) => c.createdAt > recentCutoff)
    case FilterKey.Penpay:
      return result.filter((c) => c.badge === 'penpay')
    case FilterKey.Credit:
      return result.filter((c) => c.badge === 'credit')
    case FilterKey.All:
    default:
      return result
  }
}
