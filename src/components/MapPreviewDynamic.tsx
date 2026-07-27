import { lazyLoad } from '@/lib/lazy-load'
import type { MapPreviewProps } from './MapPreview'

const MapPreviewLazy = lazyLoad(() => import('./MapPreview'),
  <div className="w-full h-full rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground text-xs" style={{ minHeight: 160 }}>
    Loading map...
  </div>
)

export default MapPreviewLazy
