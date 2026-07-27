import React from 'react'
import type { MapPreviewProps } from './MapPreview'

const MapPreview = React.lazy(() => import('./MapPreview'))

export default function MapPreviewLazy(props: MapPreviewProps) {
  return (
    <React.Suspense fallback={
      <div className="w-full h-full rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground text-xs" style={{ minHeight: 160 }}>
        Loading map...
      </div>
    }>
      <MapPreview {...props} />
    </React.Suspense>
  )
}
