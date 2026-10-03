<script lang="ts">
  import { Check, Copy } from 'phosphor-svelte'
  import type { Client } from '@/types/index'
  import { copyToClipboard, getMapsUrl, COPIED_FLASH_MS } from '@/lib/utils'
  import { clientTextWithMaps } from '@/lib/clientText'
  import { fetchClientByIdResult } from '@/lib/storage'
  import { useClientStore } from '@/stores/client-store'

  let { client, focused }: { client: Client; focused: boolean } = $props()

  let copied = $state(false)
  let loading = $state(false)
  let message = $state<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function onCopy(e: MouseEvent) {
    e.stopPropagation()
    if (loading) return
    message = null
    loading = true
    try {
      let full = client
      if (!client.address && !client.notes) {
        const result = await fetchClientByIdResult(client.id)
        const fetchedClient = result.status === 'found' || (result.status === 'offline' && result.client) ? result.client : null
        if (fetchedClient) {
          full = fetchedClient
          useClientStore.getState().upsertClient(full)
        } else if (result.status === 'not-found') {
          message = 'ไม่พบรายการ'
          return
        } else if (result.status === 'offline') {
          message = 'ออฟไลน์: อาจคัดลอกข้อมูลไม่ครบ'
        } else if (result.status === 'error') {
          message = 'โหลดข้อมูลก่อนคัดลอกไม่สำเร็จ'
          return
        }
      }
      const ok = await copyToClipboard(clientTextWithMaps(full, getMapsUrl))
      if (!ok) {
        message = 'คัดลอกไม่สำเร็จ'
        return
      }
      copied = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => (copied = false), COPIED_FLASH_MS)
    } catch {
      message = 'คัดลอกไม่สำเร็จ'
    } finally {
      loading = false
    }
  }
</script>

<button
  type="button"
  onclick={onCopy}
  disabled={loading}
  aria-label={`${message ? `${message} ` : ''}${copied ? 'คัดลอกแล้ว' : `คัดลอก ${client.shopName[0] || client.name[0] || client.id}`}`}
  title={message ?? undefined}
  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xs transition-colors disabled:cursor-wait disabled:opacity-60 {copied ? 'border-success bg-success text-success-foreground' : focused ? 'border-background/30 bg-background text-foreground hover:bg-background' : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}"
>
  {#if loading}
    <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="กำลังคัดลอก"></span>
  {:else if copied}
    <Check weight="bold" class="h-3.5 w-3.5" aria-hidden />
  {:else}
    <Copy class="h-3.5 w-3.5" aria-hidden />
  {/if}
</button>
