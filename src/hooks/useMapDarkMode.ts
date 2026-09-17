import { useEffect, useRef } from 'react'
import { getMapStyle } from '@/lib/map-styles'

export function useMapDarkMode(
  onStyleChange: (style: string) => void,
) {
  const currentStyleRef = useRef(getMapStyle())

  useEffect(() => {
    const check = () => {
      const newStyle = getMapStyle()
      if (currentStyleRef.current !== newStyle) {
        currentStyleRef.current = newStyle
        onStyleChange(newStyle)
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
  }, [onStyleChange])
}
