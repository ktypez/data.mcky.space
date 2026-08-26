import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Copy } from '@phosphor-icons/react'
import type { Client } from '@/types'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import {
  copyToClipboard,
  formatDate,
  getMapsUrl,
  COPIED_FLASH_MS,
} from '@/lib/utils'
import { clientTextWithMaps } from '@/lib/clientText'

interface RegistryGridProps {
  clients: Client[]
  /** Announced for screen readers; visual count lives in the header meta. */
  totalCount: number
}

function Thumb({ client }: { client: Client }) {
  const src = client.images[0]
  if (src) {
    return (
      <AppImage
        src={src}
        alt=""
        width={46}
        height={46}
        className="h-[46px] w-[46px] border border-border object-cover"
      />
    )
  }
  // No photo — mono initial block (omarchy icon-slot silhouette)
  const initial = (client.shopName[0] || client.name[0] || '·').trim().charAt(0).toUpperCase()
  return (
    <span
      aria-hidden="true"
      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border border-border bg-card font-mono text-base text-muted-foreground"
    >
      {initial}
    </span>
  )
}

/**
 * Quick "copy all" for one row — same smart payload as the record page
 * (text + maps link when coords exist). Fully self-contained flash;
 * stopPropagation keeps the row's open-on-click from firing.
 */
function RowCopyButton({ client, className }: { client: Client; className: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyToClipboard(clientTextWithMaps(client, getMapsUrl))
    if (!ok) return
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), COPIED_FLASH_MS)
  }

  // Keyboard activation on the button must not bubble into the row's
  // Enter/Space → navigate handler.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleCopy(e)}
      onKeyDown={onKeyDown}
      className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border bg-transparent transition-colors ${
        copied
          ? ''
          : 'border-border text-muted-foreground hover:bg-card hover:text-foreground'
      } ${className}`}
      style={copied ? { color: 'var(--v2-stable)', borderColor: 'var(--v2-stable)' } : undefined}
      aria-label={copied ? 'Copied' : `Copy details: ${client.name[0] || client.shopName[0] || client.id}`}
      title="Copy all details"
    >
      {copied ? (
        <Check weight="bold" className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  )
}

function RegistryRow({ client }: { client: Client }) {
  const navigate = useNavigate()
  // ClientNames → OverflowLine renders <div>s internally, which <button>
  // can't legally contain. So the row surface is a div[role=button].
  const open = () => navigate(`/v2/c/${client.id}`)
  const recordUrl = `/v2/c/${client.id}`
  // Modifier clicks open in a new tab (Cmd/Ctrl+click guideline) since a
  // div[role=button] has no native anchor behaviour to lean on.
  const openInNewTab = () => window.open(recordUrl, '_blank', 'noopener')
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }
  const onClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.preventDefault()
      openInNewTab()
    } else {
      open()
    }
  }
  const onAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1) openInNewTab()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onAuxClick={onAuxClick}
      onKeyDown={onKeyDown}
      className="group relative grid min-h-[104px] w-full cursor-pointer grid-cols-[46px_minmax(0,1fr)] items-start gap-3.5 bg-background p-5 text-left transition-colors hover:bg-card xl:grid-cols-[46px_minmax(0,1fr)_150px]"
      aria-label={`Open record: ${client.name[0] || client.shopName[0] || client.id}`}
    >
      {/* Corner quick-copy — mobile/tablet (no meta column there) */}
      <RowCopyButton client={client} className="absolute right-4 top-4 xl:hidden" />

      <Thumb client={client} />

      {/* Identity */}
      <span className="block min-w-0 pr-10 xl:pr-0">
        <ClientNames
          client={client}
          variant="list"
          titleClassName="text-[17px] leading-snug font-semibold text-foreground"
          subClassName="mt-1 font-mono text-[15px] leading-snug text-muted-foreground"
        />
        {/* Status line: badge + flags, omarchy card-meta vocabulary */}
        <span className="v2-meta mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {client.badge === 'penpay' && (
            <span className="inline-flex items-center gap-1.5 !text-[10px] uppercase" style={{ color: 'var(--v2-caution)' }}>
              <span className="v2-dot v2-dot-caution" aria-hidden="true" />
              penpay
            </span>
          )}
          {client.notes && (
            <span className="!text-[10px] text-muted-foreground uppercase">notes</span>
          )}
          {!hasLocation(client) && (
            <span className="!text-[10px] text-muted-foreground/70 uppercase">no pin</span>
          )}
        </span>
      </span>

      {/* Meta column — desktop only */}
      <span className="hidden min-w-0 flex-col items-end justify-between gap-2 xl:flex">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatDate(client.updatedAt)}
        </span>
        <span className="flex items-center gap-2">
          <RowCopyButton client={client} className="" />
          <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground/60 uppercase opacity-0 transition-opacity group-hover:opacity-100">
            open
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </span>
      </span>
    </div>
  )
}

function hasLocation(c: Pick<Client, 'lat' | 'lng'>): boolean {
  return c.lat !== null && c.lng !== null
}

/**
 * RegistryGrid — hairline collapsed grid (omarchy plugin-grid):
 * cells sit on a `--border` backdrop with 1px gaps so the lines never double.
 * 1 col mobile / 2 col md / 3 col xl.
 */
export default function RegistryGrid({ clients, totalCount }: RegistryGridProps) {
  if (clients.length === 0) return null

  return (
    <div
      id="v2-registry-grid"
      role="list"
      aria-label={`Registry records, showing ${clients.length} of ${totalCount}`}
      className="v2-fade-up v2-delay-3 mt-6 grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3"
    >
      {clients.map((c) => (
        <div key={c.id} role="listitem" className="min-w-0">
          <RegistryRow client={c} />
        </div>
      ))}
    </div>
  )
}
