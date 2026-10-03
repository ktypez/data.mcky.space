import type { Client } from '@/types/index'

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
    branch: typeof raw.branch === 'string' ? raw.branch.trim() : '',
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

/**
 * Title line including every shop name appended to the primary shop:
 * "xxx / yyy / zzz". If there are no shops, falls back to the first name.
 * Shop names stay on the title line — never on a separate line.
 */
export function clientTitleWithShops(c: Pick<Client, 'name' | 'shopName'>): string {
  return clientShopNames(c).join(' / ')
}

/** Values for the title line: all shops, else the first person name. */
export function clientShopNames(c: Pick<Client, 'name' | 'shopName'>): string[] {
  const shops = coerceStringArray(c.shopName)
  if (shops.length > 0) return shops
  const names = coerceStringArray(c.name)
  return names[0] ? [names[0]] : []
}

/**
 * Person-names group as a joined line ("a / b / c"), excluding the title
 * when it is one of them. Kept separate from shop names — never mixed.
 */
export function clientNamesJoined(c: Pick<Client, 'name' | 'shopName'>): string {
  return clientNameValues(c).join(' / ')
}

/** Values for the person-names line: all names, else names after the title. */
export function clientNameValues(c: Pick<Client, 'name' | 'shopName'>): string[] {
  const shops = coerceStringArray(c.shopName)
  const names = coerceStringArray(c.name)
  if (shops.length > 0) return names
  const title = names[0]
  return names.filter((n) => n !== title)
}

/**
 * Values for the compact list title: the first shop name with the branch glued
 * on ("shop - สาขา"), then any further shop names.
 *
 * Order matters — `OverflowLine` keeps the first values and collapses the rest
 * to "+N", so the branch has to sit ahead of the extra shop names to survive
 * a narrow row. The branch keeps its own wording here (no label): a list row
 * has no room for one.
 */
export function clientTitleValues(
  c: Pick<Client, 'name' | 'shopName'> & { branch?: string },
): string[] {
  const [primary, ...restShops] = clientShopNames(c)
  if (!primary) return []
  const branch = (c.branch ?? '').trim()
  return [branch ? `${primary} - ${branch}` : primary, ...restShops]
}

/**
 * Secondary line: every remaining name/shop value, joined by " / ".
 * Legacy helper — still used by the duplicate-check warning in FormNameField,
 * where a single combined hint line is acceptable.
 */
export function clientSubNames(c: Pick<Client, 'name' | 'shopName'>): string {
  const title = clientTitle(c)
  const rest = [...coerceStringArray(c.name), ...coerceStringArray(c.shopName)].filter(
    (n) => n && n !== title,
  )
  return rest.join(' / ')
}

/**
 * Strips a leading label word (plus any separator) so callers can add the
 * label exactly once: "สาขาเชียงใหม่" → "เชียงใหม่", "ร้าน: กาแฟ" → "กาแฟ".
 */
export function stripLeadingLabel(value: string | null | undefined, label: string): string {
  return (value ?? '').trim().replace(new RegExp(`^${label}[\\s:]*\\s*`), '')
}

/**
 * Branch value with any leading "สาขา" (plus a separator) removed. The label
 * is added by the caller, so the word appears exactly once whether the field
 * holds "เชียงใหม่" or "สาขาเชียงใหม่". '' when there is no branch.
 */
export function branchValue(branch: string | null | undefined): string {
  return stripLeadingLabel(branch, 'สาขา')
}

/**
 * Shop name with any leading "ร้าน" removed — the copy output already says
 * "ชื่อร้าน : …", so the word the user typed would just repeat it. A name that
 * is nothing but the label keeps the original: an empty shop line reads worse
 * than "ร้าน".
 */
export function shopNameValue(shopName: string | null | undefined): string {
  const value = (shopName ?? '').trim()
  return stripLeadingLabel(value, 'ร้าน') || value
}

/** True if any name, shopName, or branch value contains the (lowercased) query. */
export function clientMatchesQuery(
  c: Pick<Client, 'name' | 'shopName'> & { branch?: string },
  query: string,
): boolean {
  const q = query.toLowerCase()
  // An empty query would match every client (`''.includes('')` is true) —
  // callers short-circuit on empty, this is the same guard one level down.
  if (!q) return false
  return (
    coerceStringArray(c.name).some((n) => n.toLowerCase().includes(q)) ||
    coerceStringArray(c.shopName).some((n) => n.toLowerCase().includes(q)) ||
    (c.branch ?? '').toLowerCase().includes(q)
  )
}
