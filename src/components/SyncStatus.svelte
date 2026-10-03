<script lang="ts">
  import { onMount } from 'svelte'
  import { CloudArrowDown, CloudCheck, WarningCircle } from 'phosphor-svelte'
  import { listQueuedMutations } from '@/lib/offline-db'
  import { useAuthStore } from '@/stores/auth-store'

  let online = $state(typeof navigator === 'undefined' || navigator.onLine)
  let pending = $state(0)
  let failed = $state(0)

  onMount(() => {
    const refresh = async () => {
      online = typeof navigator === 'undefined' || navigator.onLine
      const uid = useAuthStore.getState().userId
      if (!uid) {
        pending = 0
        failed = 0
        return
      }
      const rows = await listQueuedMutations(uid)
      pending = rows.length
      failed = rows.filter((row) => row.lastError).length
    }
    void refresh()
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => {
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
      window.clearInterval(timer)
    }
  })
</script>

{#if !online}
  <div class="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground" role="status"><CloudArrowDown size={14} aria-hidden /> ออฟไลน์</div>
{:else if failed > 0}
  <div class="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive" role="status"><WarningCircle size={14} aria-hidden /> ซิงก์ล้มเหลว {failed}</div>
{:else if pending > 0}
  <div class="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300" role="status"><CloudArrowDown size={14} aria-hidden /> รอซิงก์ {pending}</div>
{:else}
  <div class="flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><CloudCheck size={14} aria-hidden /> ซิงก์แล้ว</div>
{/if}
