import { useEffect, useRef } from 'react'
import { getMapFlavor, type MapFlavor } from '@/lib/map-styles'

export function useMapDarkMode(
  onFlavorChange: (flavor: MapFlavor) => void,
) {
  const currentRef = useRef<MapFlavor>(getMapFlavor())

  useEffect(() => {
    const check = () => {
      const next = getMapFlavor()
      if (currentRef.current !== next) {
        currentRef.current = next
        onFlavorChange(next)
      }
    }
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-mode'] })
    const shell = document.querySelector('.v3-shell')
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-mode'] })
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', check)
    return () => {
      observer.disconnect()
      mql.removeEventListener('change', check)
    }
  }, [onFlavorChange])
}
