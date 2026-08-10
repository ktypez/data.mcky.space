import type { Client } from '@/types'

/**
 * Multi-name display helpers.
 *
 * `name` / `shopName` are `string[]` on the client. Data can arrive as a
 * JSON-encoded array (new format), a plain string (legacy rows), or — after
 * an in-flight cache round-trip — an already-parsed array. `coerceStringArray`
 * handles all three so every consumer gets a clean `string[]`.
 */

export function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        }
      } catch {
        // not JSON — fall through to plain-string handling
      }
    }
    return [value]
  }
  return []
}

/** Defensive normalize — turns any client-shaped object into a valid Client. */
export function normalizeClient(raw: Record<string, unknown>): Client {
  return {
    id: String(raw.id ?? ''),
    name: coerceStringArray(raw.name),
    shopName: coerceStringArray(raw.shopName),
    address: String(raw.address ?? ''),
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lng: typeof raw.lng === 'number' ? raw.lng : null,
    images: Array.isArray(raw.images) ? raw.images.filter((i): i is string => typeof i === 'string') : [],
    badge: typeof raw.badge === 'string' ? raw.badge : null,
    notes: typeof raw.notes === 'string' ? raw.notes : null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  }
}

export function normalizeClients(rows: Array<Record<string, unknown>>): Client[] {
  return rows.map(normalizeClient)
}

/** Primary display line: first shop name, else first person name. */
export function clientTitle(c: Pick<Client, 'name' | 'shopName'>): string {
  const shops = coerceStringArray(c.shopName)
  const names = coerceStringArray(c.name)
  return shops[0] || names[0] || ''
}

/** Secondary line: every remaining name/shop value, joined by " / ". */
export function clientSubNames(c: Pick<Client, 'name' | 'shopName'>): string {
  const title = clientTitle(c)
  const rest = [...coerceStringArray(c.name), ...coerceStringArray(c.shopName)].filter(
    (n) => n && n !== title,
  )
  return rest.join(' / ')
}

/** True if any name or shopName value contains the (lowercased) query. */
export function clientMatchesQuery(c: Pick<Client, 'name' | 'shopName'>, query: string): boolean {
  const q = query.toLowerCase()
  return (
    coerceStringArray(c.name).some((n) => n.toLowerCase().includes(q)) ||
    coerceStringArray(c.shopName).some((n) => n.toLowerCase().includes(q))
  )
}
