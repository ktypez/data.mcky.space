// Leaflet raster tiles (Esri, no API key). Flavor follows the app theme.

export type MapFlavor = 'light' | 'dark'

export const TILE_ATTRIBUTION = 'Powered by Esri'

function flavorUrl(flavor: MapFlavor): string {
  const service = flavor === 'dark' ? 'Canvas/World_Dark_Gray_Base' : 'World_Street_Map'
  // NOTE: Esri tile order is {z}/{y}/{x}.
  return `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`
}

export function tileUrl(flavor: MapFlavor): string {
  return flavorUrl(flavor)
}

export function getMapFlavor(): MapFlavor {
  if (typeof document === 'undefined') return 'light'
  if (document.documentElement.classList.contains('dark')) return 'dark'
  const shell = document.querySelector('.v3-shell') as HTMLElement | null
  if (shell) {
    const mode = shell.getAttribute('data-mode')
    if (mode === 'dark') return 'dark'
    if (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }
  return 'light'
}
