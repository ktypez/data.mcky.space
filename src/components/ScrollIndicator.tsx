import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Vertical scroll bar ──────────────────────────────────────────────────
 * Thin bar on the right edge, rendered inside .app-viewport (the gap area).
 * Tracks the primary scroll pane advertised via
 * `[data-pane-scroll="primary"]`, falling back to `.app-frame` when no
 * primary pane is registered (single-scroll pages). Re-resolves on DOM
 * mutations so route changes / breakpoint switches pick up the new pane. */

export function VerticalBar() {
  const [thumbH, setThumbH] = useState(0)
  const [thumbTop, setThumbTop] = useState(0)
  const [trackH, setTrackH] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const hideTimer = useRef<number>(0)

  const resolveEl = useCallback(
    (): HTMLElement | null =>
      document.querySelector<HTMLElement>('[data-pane-scroll="primary"]') ??
      document.querySelector<HTMLElement>('.app-frame'),
    [],
  )

  const update = useCallback(() => {
    const el = resolveEl()
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
  }, [resolveEl])

  useEffect(() => {
    let el: HTMLElement | null = null
    let raf = 0
    const onScroll = () => update()

    const attach = () => {
      el = resolveEl()
      if (!el) {
        raf = requestAnimationFrame(attach)
        return
      }
      update()
      el.addEventListener('scroll', onScroll, { passive: true })
    }
    attach()

    const mo = new MutationObserver(() => {
      const next = resolveEl()
      if (next && next !== el) {
        el?.removeEventListener('scroll', onScroll)
        el = next
        next.addEventListener('scroll', onScroll, { passive: true })
        update()
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      el?.removeEventListener('scroll', onScroll)
      clearTimeout(hideTimer.current)
    }
  }, [resolveEl, update])

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
          boxShadow: 'var(--scroll-progress-glow, none)',
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  )
}
