import React from 'react'

const MapPreview = React.lazy(() => import('./MapPreview'))

export default function MapPreviewLazy() {
  return (
    <React.Suspense fallback={
      <div className="w-full h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-secondary)] text-xs" style={{ minHeight: 160 }}>
        Loading map...
      </div>
    }>
      <MapPreview />
    </React.Suspense>
  )
}
