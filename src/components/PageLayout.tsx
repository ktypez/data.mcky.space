import { useEffect, useState, useCallback } from 'react'
import { VerticalBar } from '@/components/ScrollIndicator'
import type { ReactNode } from 'react'

interface PageLayoutProps {
  header: ReactNode
  children: ReactNode
}

/**
 * PageLayout — shared viewport + header + frame structure.
 * Lives at the App level so the header/viewport stay mounted across routes.
 * Only the children (frame content) change on navigation.
 *
 * Header "scrolled" state tracks whichever child pane advertises itself as
 * the primary scroll source via `data-pane-scroll="primary"`. In the
 * desktop 2-pane list+detail layout that's the left pane (the one users
 * scroll through most); on mobile (and other pages) it falls back to
 * `.app-frame`.
 */
export default function PageLayout({ header, children }: PageLayoutProps) {
  const [scrolled, setScrolled] = useState(false)

  const resolveScrollEl = useCallback(
    (): HTMLElement | null =>
      document.querySelector<HTMLElement>('[data-pane-scroll="primary"]') ??
      document.querySelector<HTMLElement>('.app-frame'),
    [],
  )

  useEffect(() => {
    let scrollEl: HTMLElement | null = null
    let raf = 0
    const onScroll = () => {
      const s = (scrollEl?.scrollTop ?? 0) > 8
      setScrolled((prev) => (prev === s ? prev : s))
    }
    const attach = () => {
      scrollEl = resolveScrollEl()
      if (!scrollEl) {
        raf = requestAnimationFrame(attach)
        return
      }
      onScroll()
      scrollEl.addEventListener('scroll', onScroll, { passive: true })
    }
    attach()
    // Re-resolve on DOM mutations (route change, desktop↔mobile split).
    const mo = new MutationObserver(() => {
      const next = resolveScrollEl()
      if (next && next !== scrollEl) {
        scrollEl?.removeEventListener('scroll', onScroll)
        scrollEl = next
        next.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      scrollEl?.removeEventListener('scroll', onScroll)
    }
  }, [resolveScrollEl])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="app-viewport">
        {header}
        <div className="app-frame">
          {children}
        </div>
        <VerticalBar />
      </div>
    </div>
  )
}
