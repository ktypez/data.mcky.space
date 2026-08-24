import { useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, logout } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { ArrowLeft, Trash, SignOut, LockKey, Check, Stack } from '@phosphor-icons/react'
import { PopoverMenu } from '@/components/ui/popover-menu'

/**
 * NavDropdown — main nav.
 * Active-route highlight: the menu item matching location.pathname gets
 * a primary tint + right-aligned check icon. Non-route items (login/logout)
 * never get the highlight.
 */
export default function NavDropdown() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isSignedIn, setLoginOpen } = useAuthStore()
  const { resetView } = useUIStore()
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  const pathname = location.pathname

  // Route detection:
  //   - '/' and '/c/:id' (client detail, comes back to list) → หน้าแรก
  //   - '/trash*' → ถังขยะ
  //   - '/add', '/edit/:id', '/login' → no highlight (flow screens)
  const isHome = pathname === '/' || pathname.startsWith('/c/')
  const isTrash = pathname === '/trash' || pathname.startsWith('/trash/')

  const itemClass = (active: boolean, danger = false) =>
    [
      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
      active
        ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/25'
        : danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-muted',
    ].join(' ')
  const iconClass = (active: boolean) =>
    active ? 'w-4 h-4 shrink-0 text-primary' : 'w-4 h-4 shrink-0 text-muted-foreground'

  const trigger = (
    <button
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="เปิดเมนู"
      aria-expanded={open}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="2" y="8.25" width="14" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="2" y="12.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
      </svg>
    </button>
  )

  return (
    <PopoverMenu open={open} onOpenChange={setOpen} trigger={trigger}>
      <button
        onClick={() => { close(); resetView(); navigate('/') }}
        className={itemClass(isHome)}
        aria-current={isHome ? 'page' : undefined}
      >
        <ArrowLeft className={iconClass(isHome)} />
        <span className="text-[15px] font-medium flex-1">หน้าแรก</span>
        {isHome && <Check className="w-4 h-4 shrink-0" weight="bold" />}
      </button>

      <button
        onClick={() => { close(); navigate('/v2') }}
        className={itemClass(false)}
      >
        <Stack className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-[15px] font-medium flex-1">V2 Registry</span>
        <span aria-hidden="true" className="text-xs text-muted-foreground">↗</span>
      </button>

      {isAdmin && (
        <>
          <div className="my-1 mx-2 h-px bg-border" />
          <button
            onClick={() => { close(); navigate('/trash') }}
            className={itemClass(isTrash)}
            aria-current={isTrash ? 'page' : undefined}
          >
            <Trash className={iconClass(isTrash)} />
            <span className="text-[15px] font-medium flex-1">ถังขยะ</span>
            {isTrash && <Check className="w-4 h-4 shrink-0" weight="bold" />}
          </button>
        </>
      )}

      <div className="my-1 mx-2 h-px bg-border" />
      {isSignedIn ? (
        <button
          onClick={() => { close(); void logout() }}
          className={itemClass(false, true)}
        >
          <SignOut className="w-4 h-4 shrink-0" />
          <span className="text-[15px] font-medium flex-1">ออกจากระบบ</span>
        </button>
      ) : (
        <button
          onClick={() => { close(); setLoginOpen(true) }}
          className={itemClass(false)}
        >
          <LockKey className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-[15px] font-medium flex-1">เข้าระบบ</span>
        </button>
      )}
    </PopoverMenu>
  )
}
