import { isDarkMode } from '@/lib/map-styles'

// Subscribe to dark-mode changes from the DOM/media; returns an unsubscribe.
export function observeMapDarkMode(onStyleChange: (dark: boolean) => void): () => void {
  let current = isDarkMode()
  const check = () => {
    const dark = isDarkMode()
    if (current !== dark) {
      current = dark
      onStyleChange(dark)
    }
  }
  const observer = new MutationObserver(check)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-mode', 'data-theme'] })
  const shell = document.querySelector('.ledger-shell')
  if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-mode'] })
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', check)
  return () => {
    observer.disconnect()
    mql.removeEventListener('change', check)
  }
}
