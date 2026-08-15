import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Default map center (Vientiane / Thailand region). */
export const DEFAULT_MAP_CENTER: [number, number] = [102.8236, 16.4322]

/** Duration for "copied" flash feedback (ms). */
export const COPIED_FLASH_MS = 1500

/** Geolocation API timeout (ms). */
export const GEOLOCATION_TIMEOUT_MS = 10000

/**
 * Copy text to clipboard. Returns true on success.
 *
 * Tries the legacy synchronous execCommand path FIRST — it runs entirely
 * inside the click handler (no async gap), so it works even in dropdown /
 * popover menus where browsers may revoke the transient user activation
 * needed by the async Clipboard API. Falls back to navigator.clipboard.
 */
export function copyToClipboard(text: string): Promise<boolean> {
  // 1) Synchronous execCommand — reliable in any user-gesture context.
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, ta.value.length) // required on iOS
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) return Promise.resolve(true)
  } catch {
    /* fall through to async API */
  }

  // 2) Async Clipboard API as fallback.
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    )
  }
  return Promise.resolve(false)
}

/** Build a Google Maps URL from lat/lng coordinates. */
export function getMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`
}

/** Format a unix timestamp as YYYY-MM-DD HH:MM (UTC). */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

/** Format a unix timestamp as YYYY-MM-DD (UTC). */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Check whether lat/lng coordinates are present and not NaN. */
export function hasValidCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
}

/** Generate a short unique ID (client-side). */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/**
 * Read a CSS custom property and return its hex value.
 * MapLibre's parseCssColor() only supports hex/rgb/hsl — not oklch() or var().
 * The Canvas2D trick forces the browser to resolve oklch → sRGB hex.
 */
export function cssVarToHex(varName: string, fallback = '#2e2e2e'): string {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (!raw) return fallback
  if (raw.startsWith('#')) return raw
  // Set on a temp <div> and read back computed rgb() — guaranteed to
  // resolve oklch/hsl/hwb/var to rgb() in every browser (Canvas2D
  // may return oklch on Safari/WebView, which MapLibre can't parse).
  const div = document.createElement('div')
  div.style.color = raw
  div.style.display = 'none'
  document.body.appendChild(div)
  const rgb = getComputedStyle(div).color
  document.body.removeChild(div)
  if (rgb && /^rgb/i.test(rgb)) return rgb
  return fallback
}



