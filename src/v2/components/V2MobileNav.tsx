import { useLocation, useNavigate } from 'react-router-dom'
import { Stack, Plus, ArrowSquareOut } from '@phosphor-icons/react'

const ITEMS = [
  { key: 'registry', label: 'Registry', icon: Stack, to: '/v2' },
  { key: 'add', label: 'Add', icon: Plus, to: '/v2/add' },
  { key: 'classic', label: 'Classic', icon: ArrowSquareOut, to: '/' },
] as const

function isActive(pathname: string, to: string): boolean {
  if (to === '/v2') return pathname === '/v2' || pathname.startsWith('/v2/c/')
  return pathname === to
}

/**
 * V2MobileNav — fixed bottom bar (mobile only). Omarchy mobile nav pattern:
 * icon over mono label, safe-area padded, hairline top border.
 * Active state derives from the real pathname (never hardcoded).
 */
export default function V2MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      aria-label="v2 mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-[color-mix(in_srgb,var(--card)_95%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {ITEMS.map(({ key, label, icon: Icon, to }) => {
        const active = isActive(location.pathname, to)
        return (
          <button
            key={key}
            type="button"
            onClick={() => navigate(to)}
            aria-current={active ? 'page' : undefined}
            data-active={active}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 border-0 bg-transparent font-mono text-[10px] tracking-[0.06em] uppercase ${
              active ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-4.5 w-4.5" weight={active ? 'fill' : 'regular'} aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
