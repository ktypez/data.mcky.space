import { useLocation, useNavigate } from 'react-router-dom'
import { House, Trash, Check } from '@phosphor-icons/react'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore, logout } from '@/stores/auth-store'
import ThemePresetPicker from '@/components/ThemePresetPicker'
import ThemeModePicker from '@/components/ThemeModePicker'
import { getTheme, isDarkOnlyTheme, isLightOnlyTheme } from '@/lib/design/themes'

const NAV_ITEMS = [
  { path: '/', label: 'หน้าแรก', icon: House, exact: true },
] as const

function SidebarLink({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact: boolean
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[15px] font-medium transition-colors ${
        active
          ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
          : 'text-foreground hover:bg-muted'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className="flex-1">{label}</span>
      {active && <Check className="w-3.5 h-3.5 shrink-0" weight="bold" />}
    </button>
  )
}

/**
 * NavSidebar — desktop-only sidebar navigation.
 * Hidden on mobile (max-md:hidden). Lives outside app-viewport.
 */
export default function NavSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin, isSignedIn, setLoginOpen } = useAuthStore()
  const resetView = useUIStore((s) => s.resetView)
  const themeId = useUIStore((s) => s.theme)

  const pathname = location.pathname

  // Route detection — same as NavDropdown
  const isTrash = pathname === '/trash' || pathname.startsWith('/trash/')

  const isDarkOnly = isDarkOnlyTheme(getTheme(themeId))
  const isLightOnly = isLightOnlyTheme(getTheme(themeId))
  const hideModePicker = isDarkOnly || isLightOnly

  return (
    <aside className="max-md:hidden fixed top-0 left-0 bottom-0 w-56 bg-card border-r border-border flex flex-col z-40">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-border">
        <span className="text-sm font-extrabold tracking-widest uppercase text-muted-foreground">
          ezzylist
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.path}
            path={item.path}
            label={item.label}
            icon={item.icon}
            exact={item.exact}
            active={item.exact ? pathname === item.path : pathname.startsWith(item.path)}
            onClick={() => {
              if (item.path === '/') resetView()
              navigate(item.path)
            }}
          />
        ))}

        {isAdmin && (
          <SidebarLink
            path="/trash"
            label="ถังขยะ"
            icon={Trash}
            exact={false}
            active={isTrash}
            onClick={() => navigate('/trash')}
          />
        )}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-border space-y-2">
        <button
          onClick={() => navigate('/v2')}
          className="flex w-full items-center gap-1.5 text-left text-[12px] font-medium text-muted-foreground transition-colors hover:text-primary"
          title="Registry redesign (beta)"
        >
          registry v2 <span aria-hidden="true">↗</span>
        </button>
        <div className="flex items-center gap-1.5">
          <ThemePresetPicker />
          {!hideModePicker && <ThemeModePicker />}
        </div>
        <div className="text-[12px] text-muted-foreground">
          {isSignedIn ? (
            <button onClick={() => void logout()} className="hover:text-foreground transition-colors">
              ออกจากระบบ
            </button>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="hover:text-foreground transition-colors">
              เข้าระบบ
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
