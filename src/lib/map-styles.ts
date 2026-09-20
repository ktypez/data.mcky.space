// Leaflet raster — Stadia alidade_smooth (light) / alidade_smooth_dark (dark)
// ย้อนกลับจาก vector (Stadia + MapLibre) มาที่ alidade ก่อนเปลี่ยน — Tiles โหลดชัวร์
// alidade แสดงชื่อถนนแบบ อังกฤษ+ไทยคู่ (Soi Mittraphap 4 ซอยมิตรภาพ 4) — เทียบ z16 51486/29734
// ถ้าต้องการไทยล้วนจริงต้องใช้ vector patch ไทยล้วนอีกที แต่ตอนนี้เอาแบบก่อน vector ให้ tiles กลับมา
const MAP_API_KEY = (import.meta.env.VITE_MAP_API_KEY as string | undefined)?.trim() ?? ''

const STADIA_TILES_LIGHT = 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png'
const STADIA_TILES_DARK = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '© OpenStreetMap contributors'
const STADIA_ATTRIBUTION = '© OpenStreetMap contributors | © Stadia Maps'

export const TILE_MAX_ZOOM = 19
export const TILE_ATTRIBUTION = MAP_API_KEY ? STADIA_ATTRIBUTION : OSM_ATTRIBUTION

export function getTileUrl(dark = false): string {
  if (!MAP_API_KEY) return OSM_TILES
  const base = dark ? STADIA_TILES_DARK : STADIA_TILES_LIGHT
  return `${base}?api_key=${encodeURIComponent(MAP_API_KEY)}`
}

export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  const shell = document.querySelector('.v3-shell') as HTMLElement | null
  if (shell) {
    const mode = shell.getAttribute('data-mode')
    if (mode === 'dark') return true
    if (mode === 'light') return false
    if (mode === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return document.documentElement.classList.contains('dark')
}

export const KHON_KAEN_CENTER = [102.8236, 16.4322] as [number, number]
export const KHON_KAEN_BOUNDS = [
  [101.6, 15.3],
  [103.8, 17.2],
] as [[number, number], [number, number]]
export const KHON_KAEN_MIN_ZOOM = 10

// compat — vector helpers no-op when using raster
export function hasWebGL(): boolean { return false }
export function getMapStyle(_dark = false): string { return getTileUrl(_dark) }
export function patchThaiStyle(s: unknown): unknown { return s }
export async function fetchThaiStyle(_dark = false): Promise<unknown> { return {} }
export function stadiaTransformRequest(): undefined { return undefined }
