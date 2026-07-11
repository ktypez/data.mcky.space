import React from 'react'
import type { MapPickerProps } from './MapPicker'

const MapPicker = React.lazy(() => import('./MapPicker'))

export default function MapPickerLazy(props: MapPickerProps) {
  return (
    <React.Suspense fallback={
      <div className="w-full h-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-secondary)] text-xs">
        Loading map...
      </div>
    }>
      <MapPicker {...props} />
    </React.Suspense>
  )
}
