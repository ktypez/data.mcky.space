'use client'

import { Copy } from '@phosphor-icons/react'
import type { Client } from '@/types'

interface CopyDropdownProps {
  client: Client
  copiedId: string | null
  isOpen: boolean
  onToggle: () => void
  onCopyText: (client: Client) => void
  onCopyTextAndMaps: (client: Client) => void
  onClose: () => void
  size?: 'sm' | 'md'
  mt?: string
}

export default function CopyDropdown({
  client,
  copiedId,
  isOpen,
  onToggle,
  onCopyText,
  onCopyTextAndMaps,
  onClose,
  size = 'md',
  mt = 'mt-0.5',
}: CopyDropdownProps) {
  const isCopied = copiedId === client.id
  const hasCoords = client.lat != null && client.lng != null

  const btnClass =
    size === 'sm'
      ? 'px-2.5 py-1 rounded-[4px] text-[12px]'
      : 'px-3 py-1.5 rounded-[4px] text-[13px]'

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const menuIconSize = 'w-4 h-4'

  return (
    <div className="relative inline-block" data-copy-dropdown="true">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className={`flex items-center gap-1.5 ${btnClass} font-medium transition-all cursor-pointer ring-1 ${
          isCopied
            ? 'bg-[var(--success)]/10 text-[var(--success)] ring-[var(--success)]/30'
            : 'bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--surface)] ring-[var(--border)]'
        }`}
      >
        <Copy className={iconSize} />
        {isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
      </button>
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-full ${mt} z-50 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-xl min-w-[180px] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCopyText(client)
              onClose()
            }}
            className="w-full text-left px-4 py-3 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer flex items-center gap-2"
          >
            <Copy className={`${menuIconSize} shrink-0`} />
            <span>ข้อความ</span>
          </button>
          {hasCoords && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCopyTextAndMaps(client)
                onClose()
              }}
              className="w-full text-left px-4 py-3 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer flex items-center gap-2 border-t border-[var(--border)]"
            >
              <Copy className={`${menuIconSize} shrink-0`} />
              <span>ข้อความ + แผนที่</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
