const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

export function getMapStyle(): string {
  if (typeof document === 'undefined') return LIGHT_STYLE
  if (document.documentElement.classList.contains('dark')) return DARK_STYLE
  const shell = document.querySelector('.v3-shell') as HTMLElement | null
  if (shell) {
    const mode = shell.getAttribute('data-mode')
    if (mode === 'dark') return DARK_STYLE
    if (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) return DARK_STYLE
  }
  return LIGHT_STYLE
}
