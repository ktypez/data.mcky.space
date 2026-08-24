import type { ReactNode } from 'react'

interface V2PanelBlockProps {
  /** Mono uppercase panel head label (omarchy command-panel-head). */
  label: string
  /** Optional right-side action in the head strip (e.g. a copy button). */
  action?: ReactNode
  /** 'attention' adds an accent side-bar + accent head label. */
  variant?: 'default' | 'attention'
  children: ReactNode
}

/**
 * V2PanelBlock — the omarchy "command panel": hairline box with a
 * 37px head strip (label left / action right) and body below.
 */
export default function V2PanelBlock({
  label,
  action,
  variant = 'default',
  children,
}: V2PanelBlockProps) {
  return (
    <section className={`v2-panel${variant === 'attention' ? ' v2-panel-attention' : ''}`}>
      <header className="flex h-[37px] items-center justify-between border-b border-border pr-1.5 pl-3.5">
        <h2 className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </h2>
        {action}
      </header>
      <div>{children}</div>
    </section>
  )
}
