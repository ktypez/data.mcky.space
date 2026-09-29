import type { Client } from '@/types/index'
import { branchValue, coerceStringArray, shopNameValue } from '@/lib/clientNames'

/**
 * Format a client for clipboard sharing.
 * Name, shop name, branch, address — the essentials for dropping into a chat.
 *
 * The person and the shop carry an icon (👤 house 🏠); the branch, address, and
 * map lines spell their label out in Thai, since no icon reads as clearly in
 * this app. `shopNameValue` drops a leading "ร้าน" because 🏠 already says it,
 * matching how the branch line drops a leading "สาขา".
 */
export function clientText(client: Client): string {
  const parts: string[] = []
  for (const n of coerceStringArray(client.name)) parts.push(`👤 : ${n}`)
  for (const s of coerceStringArray(client.shopName)) parts.push(`🏠 : ${shopNameValue(s)}`)
  const branch = branchValue(client.branch)
  if (branch) parts.push(`สาขา : ${branch}`)
  if (client.address) parts.push(`ที่อยู่ : ${client.address}`)
  return parts.join('\n')
}

/** Same as `clientText` but appends a Google Maps link when coords exist. */
export function clientTextWithMaps(
  client: Client,
  mapsUrl: (lat: number, lng: number) => string,
): string {
  const base = clientText(client)
  if (client.lat != null && client.lng != null) {
    return `${base}\nแผนที่ : ${mapsUrl(client.lat, client.lng)}`
  }
  return base
}
