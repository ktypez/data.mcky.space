import { useEffect, useRef, useState } from 'react'
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
 */
export default function PageLayout({ header, children }: PageLayoutProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [, setScrolled] = useState(false)

  useEffect(() => {
    let frame: HTMLElement | null = null
    let raf = 0
    const onScroll = () => {
      const s = (frame?.scrollTop ?? 0) > 8
      setScrolled((prev) => (prev === s ? prev : s))
    }
    const attach = () => {
      frame = document.querySelector('.app-frame')
      if (!frame) {
        raf = requestAnimationFrame(attach)
        return
      }
      onScroll()
      frame.addEventListener('scroll', onScroll, { passive: true })
    }
    attach()
    return () => {
      cancelAnimationFrame(raf)
      frame?.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="app-viewport">
        {header}
        <div className="app-frame" ref={frameRef}>
          {children}
        </div>
        <VerticalBar containerRef={frameRef} />
      </div>
    </div>
  )
}
