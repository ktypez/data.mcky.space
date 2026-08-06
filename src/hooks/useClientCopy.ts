import { useCallback } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { copyToClipboard, getMapsUrl } from '@/lib/utils'
import { clientText, clientTextWithMaps } from '@/lib/clientText'
import type { Client } from '@/types'

const COPIED_FLASH_MS = 1500

function flashCopied(id: string) {
  useUIStore.getState().setCopiedId(id)
  setTimeout(() => useUIStore.getState().setCopiedId(null), COPIED_FLASH_MS)
}

/**
 * Clipboard + "copied" flash for the clients list.
 *
 * Pulls all actions from `useUIStore.getState()` so the hook itself
 * doesn't re-subscribe on every render — the copied-id state is read
 * by `Clients.tsx` already.
 */
export function useClientCopy() {
  const handleCopy = useCallback(async (client: Client) => {
    const ok = await copyToClipboard(clientText(client))
    if (ok) flashCopied(client.id)
  }, [])

  const handleCopyTextAndMaps = useCallback(async (client: Client) => {
    const ok = await copyToClipboard(clientTextWithMaps(client, getMapsUrl))
    if (ok) flashCopied(client.id)
  }, [])

  return { handleCopy, handleCopyTextAndMaps }
}
