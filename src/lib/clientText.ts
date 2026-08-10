import type { Client } from '@/types'
import { coerceStringArray } from '@/lib/clientNames'

/**
 * Format a client for clipboard sharing.
 *
 * Each name gets its own `👤` line and each shop name its own `🏠` line,
 * so multi-name clients copy every value. Address keeps the `📍` prefix.
 */
export function clientText(client: Client): string {
  const parts: string[] = []
  for (const n of coerceStringArray(client.name)) parts.push(`👤 : ${n}`)
  for (const s of coerceStringArray(client.shopName)) parts.push(`🏠 : ${s}`)
  if (client.address) parts.push(`📍 : ${client.address}`)
  return parts.join('\n')
}

/** Same as `clientText` but appends a Google Maps link when coords exist. */
export function clientTextWithMaps(
  client: Client,
  mapsUrl: (lat: number, lng: number) => string,
): string {
  const base = clientText(client)
  if (client.lat != null && client.lng != null) {
    return `${base}\n🗺️ : ${mapsUrl(client.lat, client.lng)}`
  }
  return base
}
