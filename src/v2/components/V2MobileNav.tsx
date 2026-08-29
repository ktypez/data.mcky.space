import { useLocation, useNavigate } from 'react-router-dom'
import { Stack, Plus, ArrowSquareOut, Trash } from '@phosphor-icons/react'
import { useAuthStore } from '@/stores/auth-store'

interface NavItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }>
  to: string
}

const BASE_ITEMS: NavItem[] = [
  { key: 'registry', label: 'Registry', icon: Stack, to: '/v2' },
  { key: 'add', label: 'Add', icon: Plus, to: '/v2/add' },
  { key: 'classic', label: 'Classic', icon: ArrowSquareOut, to: '/' },
]

const TRASH_ITEM: NavItem = { key: 'trash', label: 'Trash', icon: Trash, to: '/v2/trash' }

function isActive(pathname: string, to: string): boolean {
  if (to === '/v2') return pathname === '/v2' || pathname.startsWith('/v2/c/')
  return pathname === to
}

/**
 * V2MobileNav — fixed bottom bar. Omarchy mobile nav pattern:
 * icon over mono label, safe-area padded, hairline top border.
 * Active state derives from the real pathname (never hardcoded).
 *
 * Breakpoint: `lg:hidden` (NOT md:hidden) — the sidebar only appears at
 * lg+, so a md–lg viewport would otherwise have zero primary navigation.
 * Admins get a fourth Trash item (the desktop sidebar's danger zone has
 * no mobile equivalent otherwise).
 */
export default function V2MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuthStore()

  const items = isAdmin ? [...BASE_ITEMS, TRASH_ITEM] : BASE_ITEMS

  return (
    <nav
      aria-label="v2 mobile navigation"
      className={`fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-[color-mix(in_srgb,var(--card)_95%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden ${
        isAdmin ? 'grid-cols-4' : 'grid-cols-3'
      }`}
    >
      {items.map(({ key, label, icon: Icon, to }) => {
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
