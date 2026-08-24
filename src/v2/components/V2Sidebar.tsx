import { useNavigate, useLocation } from 'react-router-dom'
import { Stack, Plus, ArrowSquareOut, SignOut, SignIn, Trash } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore, logout } from '@/stores/auth-store'

interface SidebarLinkProps {
  label: string
  icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }>
  active?: boolean
  disabled?: boolean
  disabledHint?: string
  trailing?: React.ReactNode
  onClick?: () => void
}

function SidebarLink({
  label,
  icon: Icon,
  active,
  disabled,
  disabledHint,
  trailing,
  onClick,
}: SidebarLinkProps) {
  return (
    <button
      type="button"
      className="v2-nav-link"
      data-active={active}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      {trailing}
    </button>
  )
}

/**
 * V2Sidebar — desktop-only registry sidebar (omarchy app-shell pattern):
 * mono brand block, grouped hairline sections, status footer.
 */
export default function V2Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const clients = useClientStore((s) => s.clients)
  const { isSignedIn, isAdmin, setLoginOpen } = useAuthStore()

  const onRegistry =
    location.pathname === '/v2' || location.pathname.startsWith('/v2/c/')
  const onAdd = location.pathname === '/v2/add' || location.pathname.startsWith('/v2/edit/')
  const onTrash = location.pathname === '/v2/trash'

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card max-md:hidden lg:flex">
      {/* Brand */}
      <div className="flex h-11 items-center gap-2.5 border-b border-border px-3.5">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center bg-primary"
        >
          <span className="block h-1.5 w-1.5 bg-background" />
        </span>
        <span className="truncate font-mono text-[12px] font-bold tracking-[0.04em] uppercase">
          ezzylist
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          // v2
        </span>
      </div>

      {/* Registry section */}
      <div className="border-b border-border px-0 pt-3.5 pb-2">
        <p className="v2-group-title">Registry</p>
        <SidebarLink
          label="Clients"
          icon={Stack}
          active={onRegistry}
          onClick={() => navigate('/v2')}
          trailing={
            <span className="v2-nav-count">{clients.length}</span>
          }
        />
      </div>

      {/* System section */}
      <div className="border-b border-border px-0 pt-3.5 pb-2">
        <p className="v2-group-title">System</p>
        <SidebarLink
          label="Add entry"
          icon={Plus}
          active={onAdd}
          onClick={() => navigate('/v2/add')}
        />
        <SidebarLink
          label="Classic UI"
          icon={ArrowSquareOut}
          onClick={() => navigate('/')}
          trailing={<span aria-hidden="true" className="font-mono text-[10px] text-muted-foreground">↗</span>}
        />
      </div>

      {/* Danger zone (admin only) */}
      {isAdmin && (
        <div className="border-b border-border px-0 pt-3.5 pb-2">
          <p className="v2-group-title">Danger zone</p>
          <SidebarLink
            label="Trash"
            icon={Trash}
            active={onTrash}
            onClick={() => navigate('/v2/trash')}
          />
        </div>
      )}

      {/* Status footer */}
      <div className="mt-auto border-t border-border">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <span className="v2-meta flex items-center gap-2 text-muted-foreground">
            <span className="v2-dot v2-dot-stable" aria-hidden="true" />
            {isSignedIn ? 'admin online' : 'guest'}
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 border-0 bg-transparent p-0 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              if (isSignedIn) void logout()
              else setLoginOpen(true)
            }}
          >
            {isSignedIn ? (
              <>
                <SignOut className="h-3.5 w-3.5" aria-hidden="true" />
                exit
              </>
            ) : (
              <>
                <SignIn className="h-3.5 w-3.5" aria-hidden="true" />
                sign in
              </>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-border px-3.5 py-2">
          <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
            data.mcky.space
          </span>
          <span className="v2-kbd !text-[9px]">V2 ALPHA</span>
        </div>
      </div>
    </aside>
  )
}
