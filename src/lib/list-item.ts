import type { Client, ClientListItem } from '@/types/index'

/**
 * Convert a lightweight list item to a full Client with safe defaults.
 * Used when the store is populated from the /api/clients/list endpoint.
 * Detail fields (address, notes, lat/lng, images) are empty. The note body
 * stays private; `hasNotes` lets the catalog filter without loading details.
 */
export function listItemToClient(item: ClientListItem): Client {
  return {
    id: item.id,
    name: item.name,
    shopName: item.shopName,
    address: '',
    lat: null,
    lng: null,
    images: item.image ? [item.image] : [],
    thumb: item.thumb ?? null,
    badge: item.badge,
    notes: null,
    hasNotes: item.hasNotes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}
