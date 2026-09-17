import { useState } from 'react'

export interface StaticMapPreviewProps {
  lat: number
  lng: number
}

const ZOOM = 15

/** Slippy-map tile containing the point, so the coords land at the tile center. */
function tileXY(lat: number, lng: number): { x: number; y: number } {
  const n = 2 ** ZOOM
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor((((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n))
  return { x, y }
}

function isDark(): boolean {
  if (typeof document === 'undefined') return false
  if (document.documentElement.classList.contains('dark')) return true
  const shell = document.querySelector('.v3-shell') as HTMLElement | null
  if (shell) {
    const mode = shell.getAttribute('data-mode')
    if (mode === 'dark') return true
    if (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) return true
  }
  return false
}

/** Zero-JS map preview: one CARTO raster tile with a CSS dot at the center
    (the tile is centered on the coords, matching the old GL preview).
    Full maplibre stays only in the editor picker. */
export default function StaticMapPreview({ lat, lng }: StaticMapPreviewProps) {
  const [failed, setFailed] = useState(false)
  const { x, y } = tileXY(lat, lng)
  const flavor = isDark() ? 'dark_all' : 'voyager'
  const src = `https://a.basemaps.cartocdn.com/rastertiles/${flavor}/${ZOOM}/${x}/${y}@2x.png`

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted font-mono text-xs text-muted-foreground">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    )
  }
  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-card shadow-sm"
      />
      <span className="absolute bottom-1 right-2 font-mono text-[9px] text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
        © OpenStreetMap © CARTO
      </span>
    </div>
  )
}
