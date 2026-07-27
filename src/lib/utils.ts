import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Copy text to clipboard with fallback for older browsers. */
export function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch((e) => console.warn('Clipboard write failed', e))
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

/** Build a Google Maps URL from lat/lng coordinates. */
export function getMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`
}

/** Format a unix timestamp as YYYY-MM-DD HH:MM. */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

/** Format a unix timestamp as YYYY-MM-DD. */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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


