import { useLocation, useNavigate } from 'react-router-dom'
import { MagnifyingGlass, Sun, Moon, House } from '@phosphor-icons/react'
import { requestSearchFocus } from './V2Toolbar'

interface V2TopbarProps {
  mode: 'dark' | 'light'
  onToggleMode: () => void
}

function crumbSegments(pathname: string): string[] {
  if (pathname.startsWith('/v2/c/')) {
    const id = pathname.slice('/v2/c/'.length)
    return ['registry', id.slice(0, 8)]
  }
  if (pathname.startsWith('/v2/edit/')) {
    const id = pathname.slice('/v2/edit/'.length)
    return ['registry', 'edit', id.slice(0, 8)]
  }
  if (pathname === '/v2/add') return ['registry', 'new']
  if (pathname === '/v2/trash') return ['trash']
  return ['registry']
}

/**
 * V2Topbar — sticky 44px hairline bar. Omarchy pattern:
 * crumbs left, joined square-action chrome right, blurred backdrop.
 */
export default function V2Topbar({ mode, onToggleMode }: V2TopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b border-border bg-[color-mix(in_srgb,var(--background)_92%,transparent)] pr-2 pl-4 backdrop-blur-md">
      <nav className="v2-crumbs min-w-0" aria-label="Breadcrumb">
        <span className="text-muted-foreground">ezzylist</span>
        {crumbSegments(location.pathname).map((seg, i) => (
          <span key={`${i}-${seg}`}>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <b>{seg}</b>
          </span>
        ))}
      </nav>

      <div className="flex h-full items-center">
        <button
          type="button"
          className="v2-btn h-full border-0 border-l border-border"
          onClick={() => {
            if (location.pathname !== '/v2') navigate('/v2')
            requestSearchFocus()
          }}
          aria-label="Search clients (Ctrl K)"
        >
          <MagnifyingGlass className="h-3.5 w-3.5" aria-hidden="true" />
          <kbd className="v2-kbd hidden sm:inline-block">Ctrl K</kbd>
        </button>

        <button
          type="button"
          className="v2-btn h-full border-y-0 border-r-0 border-l border-border"
          onClick={() => navigate('/')}
          aria-label="Open classic UI"
        >
          <House className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Classic</span>
        </button>

        <button
          type="button"
          className="v2-btn v2-btn-icon h-full border-0 border-l border-border"
          onClick={onToggleMode}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mode === 'dark' ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  )
}
