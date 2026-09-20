import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { clientMatchesQuery } from '@/lib/clientNames'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import NameAvatar from '@/components/NameAvatar'
import type { Client } from '@/types/index'

export default function V3CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const clients = useClientStore((s) => s.clients)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients.slice(0, 8)
    return clients
      .filter((c) => clientMatchesQuery(c, q) || c.address.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .slice(0, 8)
  }, [clients, query])

  useEffect(() => { setFocused(0) }, [query, open])

  // global hotkey Cmd+K / Ctrl+K and "/" to open + external event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)
      const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)
      if (isK) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (isSlash) {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    const onOpenEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette' as unknown as keyof WindowEventMap, onOpenEvent as EventListener)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette' as unknown as keyof WindowEventMap, onOpenEvent as EventListener)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      // focus after mount
      setTimeout(() => inputRef.current?.focus(), 10)
      // lock scroll
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const onSelect = (client: Client) => {
    setOpen(false)
    navigate(`/c/${client.id}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused((f) => Math.min(f + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused((f) => Math.max(f - 1, 0))
    } else if (e.key === 'Enter' && filtered[focused]) {
      e.preventDefault()
      onSelect(filtered[focused])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[18vh] backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="ค้นหา">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <MagnifyingGlass className="h-5 w-5 shrink-0 text-muted-foreground" weight="bold" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="พิมพ์ชื่อ ร้าน หรือ ID… — Enter เพื่อเปิด"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="hidden shrink-0 rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground sm:block">Esc</span>
        </div>

        <div className="max-h-[50vh] overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              ไม่พบ “{query}” — ลองคำอื่น
            </div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.id}
                onMouseEnter={() => setFocused(i)}
                onClick={() => onSelect(c)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === focused ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {c.images[0] || c.thumb ? (
                  <AppImage
                    src={c.thumb ?? c.images[0]}
                    fallbackSrc={c.thumb ? c.images[0] : undefined}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover border border-black/10"
                  />
                ) : (
                  <NameAvatar className={i === focused ? 'ring-2 ring-background' : ''} />
                )}
                <span className="min-w-0 flex-1">
                  <ClientNames client={c} variant="list" titleClassName={`text-sm leading-tight truncate ${i === focused ? 'text-primary-foreground' : 'text-foreground'}`} subClassName={`text-xs truncate ${i === focused ? 'text-primary-foreground/60' : 'opacity-60'}`} />
                </span>
                <ArrowRight size={14} className={i === focused ? 'text-primary-foreground/60' : 'text-muted-foreground/40'} weight="bold" />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 font-mono text-[10px] text-muted-foreground">
          <span className="hidden sm:inline">↑↓ เลือก · Enter เปิด · Esc ปิด</span>
          <span className="sm:hidden">แตะเพื่อเปิด</span>
          <span className="tabular-nums">{filtered.length} รายการ</span>
        </div>
      </div>
    </div>
  )
}
