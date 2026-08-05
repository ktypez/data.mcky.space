import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Vertical scroll bar ──────────────────────────────────────────────────
 * Thin bar on the right edge, rendered inside .app-viewport (the gap area).
 * Uses containerRef (the .app-frame) for scroll tracking, but positions
 * itself in the viewport via offsetTop. */

interface VerticalBarProps {
  containerRef: React.RefObject<HTMLElement | null>
}

export function VerticalBar({ containerRef }: VerticalBarProps) {
  const [thumbH, setThumbH] = useState(0)
  const [thumbTop, setThumbTop] = useState(0)
  const [trackH, setTrackH] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const hideTimer = useRef<number>(0)

  const update = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight, offsetTop } = el
    if (scrollHeight <= clientHeight + 1) {
      setThumbH(0)
      return
    }
    const ratio = clientHeight / scrollHeight
    const h = Math.max(24, clientHeight * ratio)
    const maxTop = clientHeight - h
    const scrollRatio = scrollTop / (scrollHeight - clientHeight)
    setThumbH(h)
    setTrackH(clientHeight)
    setThumbTop(offsetTop + scrollRatio * maxTop)
    setOpacity(1)
    clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setOpacity(0), 1500)
  }, [containerRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      el.removeEventListener('scroll', update)
      clearTimeout(hideTimer.current)
    }
  }, [containerRef, update])

  if (thumbH === 0) return null

  return (
    <div
      className="pointer-events-none absolute right-0 z-50"
      style={{
        top: 0,
        bottom: 0,
        width: 'var(--scroll-indicator-width, 5px)',
      }}
    >
      <div
        className="absolute right-0 w-full"
        style={{
          height: thumbH,
          top: thumbTop,
          opacity,
          background: 'var(--scroll-indicator-color, oklch(0.5 0 0 / 0.2))',
          borderRadius: 'var(--scroll-indicator-radius, 999px)',
          boxShadow: 'var(--scroll-indicator-glow, none)',
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  )
}
