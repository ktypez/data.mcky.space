import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'

/**
 * ViewportEffect — syncs viewportMode state with data-viewport attribute on <html>.
 * 'auto' → computes from actual viewport width (≥768px = 'desktop', else 'mobile').
 * 'mobile' → forces data-viewport="mobile" (vd:hidden components show).
 * 'desktop' → forces data-viewport="desktop" (max-vd:hidden components show).
 */
export default function ViewportEffect() {
  const viewportMode = useUIStore((s) => s.viewportMode)

  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(min-width: 768px)')

    function apply() {
      if (viewportMode === 'auto') {
        root.setAttribute('data-viewport', mq.matches ? 'desktop' : 'mobile')
      } else {
        root.setAttribute('data-viewport', viewportMode)
      }
    }

    apply()
    if (viewportMode === 'auto') {
      mq.addEventListener('change', apply)
      return () => {
        mq.removeEventListener('change', apply)
        root.removeAttribute('data-viewport')
      }
    }
    return () => root.removeAttribute('data-viewport')
  }, [viewportMode])

  return null
}
