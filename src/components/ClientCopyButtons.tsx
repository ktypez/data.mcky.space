import { ClipboardText, Check } from '@phosphor-icons/react'
import { hasValidCoords } from '@/lib/utils'
import type { Client } from '@/types'

interface ClientCopyButtonsProps {
  client: Client
  copiedKey: string | null
  onCopyText: (client: Client) => void
  onCopyTextAndMaps: (client: Client) => void
}

/**
 * Two compact copy buttons for the clients list — copy "ข้อความ" and
 * "ข้อความ + แผนที่" directly (no dropdown, no portal, no frame-clipping).
 * Clicking a row/card should still navigate to the detail view, so every
 * handler stops propagation to the parent.
 */
export default function ClientCopyButtons({
  client,
  copiedKey,
  onCopyText,
  onCopyTextAndMaps,
}: ClientCopyButtonsProps) {
  const hasCoords = hasValidCoords(client.lat, client.lng)
  const isTextCopied = copiedKey === `${client.id}:text`
  const isMapsCopied = copiedKey === `${client.id}:maps`

  const base =
    'size-7 shrink-0 grid place-items-center rounded-md cursor-pointer ring-1 transition-all'
  const idle =
    'bg-card text-muted-foreground hover:bg-card ring-border'
  const copied =
    'bg-success/10 text-success ring-success/30'

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        title={isTextCopied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}
        onClick={(e) => {
          e.stopPropagation()
          onCopyText(client)
        }}
        className={`${base} ${isTextCopied ? copied : idle}`}
        data-copy-btn="text"
      >
        {isTextCopied ? (
          <Check className="w-3.5 h-3.5" weight="bold" />
        ) : (
          <ClipboardText className="w-3.5 h-3.5" />
        )}
      </button>

      {hasCoords && (
        <button
          type="button"
          title={isMapsCopied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ + แผนที่'}
          onClick={(e) => {
            e.stopPropagation()
            onCopyTextAndMaps(client)
          }}
          className={`${base} ${isMapsCopied ? copied : idle}`}
          data-copy-btn="maps"
        >
          {isMapsCopied ? (
            <Check className="w-3.5 h-3.5" weight="bold" />
          ) : (
            <ClipboardText className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  )
}