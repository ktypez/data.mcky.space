import { useEffect, useRef, useState } from 'react'
import { lazyLoad } from '@/lib/lazy-load'
import type { MapPreviewProps } from './MapPreview'

function Placeholder() {
  return (
    <div className="w-full h-full rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground text-xs" style={{ minHeight: 160 }}>
      Loading map...
    </div>
  )
}

const MapPreviewLazy = lazyLoad(() => import('./MapPreview'), <Placeholder />)

/** Mount the GL preview only when it scrolls near the viewport, so opening
    a record doesn't pull the 1MB maplibre chunk unless the user scrolls
    down to the map. Layout is preserved by the same placeholder. */
export default function MapPreviewDynamic(props: MapPreviewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="h-full w-full">
      {near ? <MapPreviewLazy {...props} /> : <Placeholder />}
    </div>
  )
}
