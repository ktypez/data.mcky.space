import { useCallback } from 'react'
import { useUIStore } from '@/old/stores/ui-store'
import { copyToClipboard, getMapsUrl, COPIED_FLASH_MS } from '@/lib/utils'
import { clientText, clientTextWithMaps } from '@/lib/clientText'
import type { Client } from '@/types/index'

function flashCopied(key: string) {
  useUIStore.getState().setCopiedId(key)
  setTimeout(() => useUIStore.getState().setCopiedId(null), COPIED_FLASH_MS)
}

/**
 * Clipboard + "copied" flash for the clients list.
 *
 * The flash key encodes both the client and the action (`<id>:text` /
 * `<id>:maps`) so a row with two copy buttons can highlight the exact one
 * that succeeded. Pulls all actions from `useUIStore.getState()` so the hook
 * itself doesn't re-subscribe on every render.
 */
export function useClientCopy() {
  const handleCopy = useCallback(async (client: Client) => {
    const ok = await copyToClipboard(clientText(client))
    if (ok) flashCopied(`${client.id}:text`)
  }, [])

  const handleCopyTextAndMaps = useCallback(async (client: Client) => {
    const ok = await copyToClipboard(clientTextWithMaps(client, getMapsUrl))
    if (ok) flashCopied(`${client.id}:maps`)
  }, [])

  // Smart: maps + text when coords exist, otherwise text only. One key per
  // client so a single button flashes correctly.
  const handleCopySmart = useCallback(async (client: Client) => {
    const ok = await copyToClipboard(clientTextWithMaps(client, getMapsUrl))
    if (ok) flashCopied(client.id)
  }, [])

  return { handleCopy, handleCopyTextAndMaps, handleCopySmart }
}