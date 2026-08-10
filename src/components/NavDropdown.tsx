import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, logout } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { ArrowLeft, MapTrifold, Trash, SignOut, LockKey } from '@phosphor-icons/react'
import { PopoverMenu } from '@/components/ui/popover-menu'

export default function NavDropdown() {
  const navigate = useNavigate()
  const { isAdmin, isSignedIn, setLoginOpen } = useAuthStore()
  const { resetView } = useUIStore()
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

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
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-[15px] font-medium">หน้าแรก</span>
      </button>
      <button
        onClick={() => { close(); navigate('/maps') }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
      >
        <MapTrifold className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-[15px] font-medium">แผนที่</span>
      </button>

      {isAdmin && (
        <>
          <div className="my-1 mx-2 h-px bg-border" />
          <button
            onClick={() => { close(); navigate('/trash') }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
          >
            <Trash className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-[15px] font-medium">ถังขยะ</span>
          </button>
        </>
      )}

      <div className="my-1 mx-2 h-px bg-border" />
      {isSignedIn ? (
        <button
          onClick={() => { close(); void logout() }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors"
        >
          <SignOut className="w-4 h-4 shrink-0" />
          <span className="text-[15px] font-medium">ออกจากระบบ</span>
        </button>
      ) : (
        <button
          onClick={() => { close(); setLoginOpen(true) }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
        >
          <LockKey className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-[15px] font-medium">เข้าระบบ</span>
        </button>
      )}
    </PopoverMenu>
  )
}
