import { useEffect, useRef } from 'react'
import { isDarkMode } from '@/lib/map-styles'

export function useMapDarkMode(
  onStyleChange: (dark: boolean) => void,
) {
  const currentRef = useRef(isDarkMode())

  useEffect(() => {
    const check = () => {
      const dark = isDarkMode()
      if (currentRef.current !== dark) {
        currentRef.current = dark
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
  }, [onStyleChange])
}