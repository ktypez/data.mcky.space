'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { ArrowLeft, MapTrifold, ChatDots, Trash, SignOut, LockKey } from '@phosphor-icons/react'

export default function NavDropdown() {
  const navigate = useNavigate()
  const { isAdmin, logout, setLoginOpen } = useAuthStore()
  const { resetView } = useUIStore()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => setOpen(false)

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const gap = 8
      const popupWidth = 300
      const estHeight = 260
      let top = rect.bottom + 6
      let left = rect.left
      if (left + popupWidth > window.innerWidth - gap) {
        left = Math.max(gap, window.innerWidth - popupWidth - gap)
      }
      if (top + estHeight > window.innerHeight - gap) {
        top = Math.max(gap, rect.top - estHeight - gap)
      }
      setPos({ top, left })
    }
    setOpen(!open)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
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

      {open && <div className="fixed inset-0 z-40" onClick={close} />}

      {open && typeof document === 'object' &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[999] w-fit min-w-36 bg-card border border-border rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95"
            style={{ top: pos.top, left: pos.left }}
          >
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
                <button
                  onClick={() => { close(); navigate('/suggestions') }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                >
                  <ChatDots className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-[15px] font-medium">คำแนะนำการแก้ไข</span>
                </button>
              </>
            )}

            <div className="my-1 mx-2 h-px bg-border" />
            {isAdmin ? (
              <button
                onClick={() => { close(); logout() }}
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
          </div>,
          document.body,
        )}
    </>
  )
}
