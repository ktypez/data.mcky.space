import React from 'react'

const MapPicker = React.lazy(() => import('./MapPicker'))

export default function MapPickerLazy() {
  return (
    <React.Suspense fallback={
      <div className="w-full h-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-secondary)] text-xs">
        Loading map...
      </div>
    }>
      <MapPicker />
    </React.Suspense>
  )
}
