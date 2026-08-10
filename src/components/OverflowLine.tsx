import { useEffect, useRef, useState } from 'react'

interface OverflowLineProps {
  values: string[]
  separator?: string
  className?: string
}

/**
 * Renders `values` joined by `separator` on a single nowrap line. When the
 * line would overflow its container, only the values that fit are shown and
 * the hidden remainder becomes a "+N" suffix (e.g. "ร้านหนึ่ง / ร้านสอง +2").
 *
 * Width is measured with a hidden inline span that shares the container's
 * font, so the cutoff matches the exact rendered text — no guessing.
 */
export default function OverflowLine({
  values,
  separator = ' / ',
  className = '',
}: OverflowLineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(values.length)

  useEffect(() => {
    const container = containerRef.current
    const measurer = measureRef.current
    if (!container || !measurer || values.length === 0) return

    const compute = () => {
      const maxWidth = container.clientWidth
      const count = values.length
      // Binary search the largest prefix (incl. "+N" suffix) that fits.
      let lo = 1
      let hi = count
      let best = count
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const tail = mid < count ? ` +${count - mid}` : ''
        measurer.textContent = values.slice(0, mid).join(separator) + tail
        if (measurer.offsetWidth <= maxWidth) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      setVisible(best)
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(container)
    return () => ro.disconnect()
  }, [values, separator])

  if (values.length === 0) return null

  const overflow = values.length - visible

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden whitespace-nowrap ${className}`}
    >
      {values.slice(0, visible).join(separator)}
      {overflow > 0 && <span className="text-muted-foreground"> +{overflow}</span>}
      {/* Hidden measurer — inherits the container's font, never painted. */}
      <span
        ref={measureRef}
        aria-hidden
        className="invisible absolute left-[-9999px] top-0 whitespace-nowrap"
      />
    </div>
  )
}
