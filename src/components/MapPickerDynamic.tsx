import { lazyLoad } from '@/lib/lazy-load'
import type { MapPickerProps } from './MapPicker'

const MapPickerLazy = lazyLoad(() => import('./MapPicker'),
  <div className="w-full h-48 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground text-xs">
    Loading map...
  </div>
)

export default MapPickerLazy
