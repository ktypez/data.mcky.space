import { useEffect, useRef, useState, useMemo, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { clientMatchesQuery } from '@/lib/clientNames'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import NameAvatar from '@/components/NameAvatar'
import AppDialog from '@/components/AppDialog'
import type { Client } from '@/types/index'

export default function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousOverflowRef = useRef<string | null>(null)
  const clients = useClientStore(s => s.clients)
  const loading = useClientStore(s => s.loading)
  const error = useClientStore(s => s.error)
  const deferredQuery = useDeferredValue(query)

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return clients.slice(0, 8)
    return clients
      .filter(c => clientMatchesQuery(c, q) || c.address.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      .slice(0, 8)
  }, [clients, deferredQuery])

  useEffect(() => { setFocused(0) }, [query, open])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
      const target = event.target
      const isTextEntry = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !isTextEntry
      if (isK) {
        event.preventDefault()
        setOpen(value => !value)
      } else if (isSlash) {
        event.preventDefault()
        setOpen(true)
      } else if (event.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    const onOpenEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    const eventName = 'open-command-palette' as unknown as keyof WindowEventMap
    window.addEventListener(eventName, onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(eventName, onOpenEvent)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 10)
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
      document.body.style.overflow = previousOverflowRef.current ?? ''
      previousOverflowRef.current = null
      setQuery('')
    }
  }, [open])

  const onSelect = (client: Client) => {
    setOpen(false)
    navigate(`/c/${encodeURIComponent(client.id)}`)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && filtered.length > 0) {
      event.preventDefault()
      setFocused(current => Math.min(current + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp' && filtered.length > 0) {
      event.preventDefault()
      setFocused(current => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && filtered[focused]) {
      event.preventDefault()
      onSelect(filtered[focused])
    }
  }

  return (
    <AppDialog open={open} onClose={() => setOpen(false)} title="ค้นหา" showHeader={false} panelClassName="max-w-xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <MagnifyingGlass className="h-5 w-5 shrink-0 text-muted-foreground" weight="bold" aria-hidden />
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="พิมพ์ชื่อ ร้าน หรือ ID… — Enter เพื่อเปิด" aria-label="ค้นหาชื่อ ร้าน หรือ ID" className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" autoComplete="off" spellCheck={false} />
        <span className="hidden shrink-0 rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground sm:block">Esc</span>
      </div>

      <div className="max-h-[50vh] overflow-auto p-2" role="listbox" aria-label="ผลการค้นหา">
        {loading && clients.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดรายการ…</div>
        ) : error && clients.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-destructive" role="alert">โหลดรายการไม่สำเร็จ</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">ไม่พบ “{query}” — ลองคำอื่น</div>
        ) : (
          filtered.map((client, index) => (
            <button
              key={client.id}
              type="button"
              role="option"
              aria-selected={index === focused}
              onFocus={() => setFocused(index)}
              onMouseEnter={() => setFocused(index)}
              onClick={() => onSelect(client)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${index === focused ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {client.images[0] || client.thumb ? <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover border border-border" /> : <NameAvatar className={index === focused ? 'ring-2 ring-background' : ''} />}
              <span className="min-w-0 flex-1"><ClientNames client={client} variant="list" titleClassName={`text-sm leading-tight truncate ${index === focused ? 'text-primary-foreground' : 'text-foreground'}`} subClassName={`text-xs truncate ${index === focused ? 'text-primary-foreground/60' : 'opacity-60'}`} /></span>
              <ArrowRight size={14} className={index === focused ? 'text-primary-foreground/60' : 'text-muted-foreground/40'} weight="bold" aria-hidden />
            </button>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 font-mono text-[10px] text-muted-foreground">
        <span className="hidden sm:inline">↑↓ เลือก · Enter เปิด · Esc ปิด</span>
        <span className="sm:hidden">แตะเพื่อเปิด</span>
        <span className="tabular-nums">{filtered.length} รายการ</span>
      </div>
    </AppDialog>
  )
}
