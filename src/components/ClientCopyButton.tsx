import { ClipboardText, Check } from '@phosphor-icons/react'
import type { Client } from '@/types'

interface ClientCopyButtonProps {
  client: Client
  copiedKey: string | null
  onCopySmart: (client: Client) => void
}

/**
 * One copy button for the clients list — copies text + maps when the client
 * has valid coordinates, otherwise text only. Direct call in the click
 * handler (no dropdown, no portal, no frame-clipping). Stops propagation so
 * clicking a row/card still navigates to the detail view.
 */
export default function ClientCopyButton({
  client,
  copiedKey,
  onCopySmart,
}: ClientCopyButtonProps) {
  const isCopied = copiedKey === client.id

  return (
    <button
      type="button"
      title={isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
      onClick={(e) => {
        e.stopPropagation()
        onCopySmart(client)
      }}
      className={`copy-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[14px] font-medium cursor-pointer ring-1 ${
        isCopied
          ? 'bg-success/10 text-success ring-success/30'
          : 'bg-card text-muted-foreground hover:bg-card ring-border'
      }`}
    >
      {isCopied ? (
        <Check className="w-3.5 h-3.5" weight="bold" />
      ) : (
        <ClipboardText className="w-3.5 h-3.5" />
      )}
      <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
    </button>
  )
}