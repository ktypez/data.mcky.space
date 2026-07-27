export const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
export const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

export function getMapStyle(): string {
  if (typeof document === 'undefined') return LIGHT_STYLE
  return document.documentElement.classList.contains('dark') ? DARK_STYLE : LIGHT_STYLE
}
