import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'

/**
 * ViewportEffect — syncs viewportMode state with data-viewport attribute on <html>.
 * 'auto' removes the attribute (lets physical viewport breakpoints work).
 * 'mobile' sets data-viewport="mobile" (vd:hidden components show).
 * 'desktop' sets data-viewport="desktop" (max-vd:hidden components show).
 */
export default function ViewportEffect() {
  const viewportMode = useUIStore((s) => s.viewportMode)

  useEffect(() => {
    const root = document.documentElement
    if (viewportMode === 'auto') {
      root.removeAttribute('data-viewport')
    } else {
      root.setAttribute('data-viewport', viewportMode)
    }
    return () => root.removeAttribute('data-viewport')
  }, [viewportMode])

  return null
}
