import type { Client } from '@/types'

/**
 * Format a client for clipboard sharing.
 *
 * The `👤` / `🏪` / `📍` prefixes are the same ones the original
 * `clientText()` used (encoded as `\uD83D\uDC64` etc.) — kept for
 * visual consistency with the v1 mobile UI.
 */
export function clientText(client: Client): string {
  const parts: string[] = []
  parts.push(`👤 : ${client.name}`)
  if (client.shopName) parts.push(`🏪 : ${client.shopName}`)
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
