import { useEffect, useRef } from 'react'
import { getMapStyle } from '@/lib/map-styles'

export function useMapDarkMode(
  onStyleChange: (style: string) => void,
) {
  const currentStyleRef = useRef(getMapStyle())

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newStyle = getMapStyle()
      if (currentStyleRef.current !== newStyle) {
        currentStyleRef.current = newStyle
        onStyleChange(newStyle)
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [onStyleChange])
}
