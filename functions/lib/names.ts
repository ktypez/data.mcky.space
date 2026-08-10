/**
 * Multi-name support for `name` / `shopName`.
 *
 * Storage format: D1 TEXT columns now hold JSON-encoded string arrays
 * (`["A","B"]`). Legacy rows hold a plain string (`"A"`). Reads must
 * coerce both shapes to `string[]` — this is the single source of truth
 * for that logic (server side).
 */

/** Coerce any stored value into a non-empty `string[]`. */
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

/** Serialize a name/shopName value for storage (always JSON array). */
export function serializeNames(value: unknown): string {
  return JSON.stringify(coerceStringArray(value))
}

/** Coerce the name/shopName fields of a DB row into arrays. */
export function normalizeClient<T extends Record<string, unknown>>(
  row: T,
): T & { name: string[]; shopName: string[] } {
  return { ...row, name: coerceStringArray(row.name), shopName: coerceStringArray(row.shopName) }
}

/** Coerce a whole list of rows (list endpoints). */
export function normalizeClientList<T extends Record<string, unknown>>(
  rows: T[],
): Array<T & { name: string[]; shopName: string[] }> {
  return rows.map(normalizeClient)
}
