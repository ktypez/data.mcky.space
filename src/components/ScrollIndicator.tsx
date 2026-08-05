import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Vertical scroll bar ──────────────────────────────────────────────────
 * Thin bar on the right edge of a scroll container.
 * Color, width, radius, glow driven by CSS custom properties per theme.
 * Appears on scroll, fades out after 1.5 s idle.
 * Returns null when content fits (no scroll needed). */

interface VerticalBarProps {
  containerRef: React.RefObject<HTMLElement | null>
}

export function VerticalBar({ containerRef }: VerticalBarProps) {
  const [thumbH, setThumbH] = useState(0)
  const [thumbTop, setThumbTop] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const hideTimer = useRef<number>(0)

  const update = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight + 1) {
      setThumbH(0)
      return
    }
    const ratio = clientHeight / scrollHeight
    const h = Math.max(24, clientHeight * ratio)
    const maxTop = clientHeight - h
    const scrollRatio = scrollTop / (scrollHeight - clientHeight)
    setThumbH(h)
    setThumbTop(scrollRatio * maxTop)
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
      className="pointer-events-none absolute top-0 bottom-0 z-50"
      style={{
        right: 2,
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

/* ── Top progress bar ─────────────────────────────────────────────────────
 * Thin horizontal bar at the very top of the viewport.
 * Width tracks scroll % of .app-frame.
 * Re-attaches on route change via locationKey prop.
 * Hidden when scrolled to top. */

export function TopProgress({ locationKey }: { locationKey: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const frame = document.querySelector('.app-frame')
    if (!frame) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = frame
      if (scrollHeight <= clientHeight) {
        setProgress(0)
        return
      }
      setProgress((scrollTop / (scrollHeight - clientHeight)) * 100)
    }
    frame.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => frame.removeEventListener('scroll', onScroll)
  }, [locationKey])

  if (progress <= 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          background: 'var(--scroll-progress-color, var(--primary))',
          boxShadow: 'var(--scroll-progress-glow, none)',
          transition: 'width 150ms ease-out',
        }}
      />
    </div>
  )
}
