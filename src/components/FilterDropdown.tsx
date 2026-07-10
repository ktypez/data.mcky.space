'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Funnel, Image, Circle, Clock, Check } from '@phosphor-icons/react'
import { FilterKey } from '@/types'

interface Counts {
  total: number
  withImages: number
  noImages: number
  recent: number
}

interface Props {
  filter: FilterKey
  counts: Counts
  onFilter: (key: FilterKey) => void
}

const filterItems: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: FilterKey.All, label: 'ทั้งหมด', icon: <Funnel className="w-3.5 h-3.5" /> },
  { key: FilterKey.WithImages, label: 'มีรูปภาพ', icon: <Image className="w-3.5 h-3.5" /> },
  { key: FilterKey.NoImages, label: 'ไม่มีรูป', icon: <Circle className="w-3.5 h-3.5" /> },
  { key: FilterKey.Recent, label: 'สร้างใน 7 วัน', icon: <Clock className="w-3.5 h-3.5" /> },
]

export default function FilterDropdown({ filter, counts, onFilter }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => setOpen(false)

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const gap = 8
      const popupWidth = 300
      const estHeight = 220
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

  const currentLabel = filterItems.find((f) => f.key === filter)?.label ?? 'ทั้งหมด'

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors shrink-0"
        aria-label="กรองข้อมูล"
        aria-expanded={open}
      >
        <Funnel className="w-3.5 h-3.5" />
        <span>{currentLabel}</span>
      </button>

      {open && <div className="fixed inset-0 z-40" onClick={close} />}

      {open && typeof document === 'object' &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[999] w-fit min-w-36 bg-card border border-border rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95"
            style={{ top: pos.top, left: pos.left }}
          >
            {filterItems.map((item) => {
              const isActive = filter === item.key
              const count =
                item.key === FilterKey.All
                  ? counts.total
                  : item.key === FilterKey.WithImages
                    ? counts.withImages
                    : item.key === FilterKey.NoImages
                      ? counts.noImages
                      : counts.recent

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onFilter(item.key)
                    close()
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                  <span className="text-[13px] font-medium flex-1">{item.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{count}</span>
                  {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
