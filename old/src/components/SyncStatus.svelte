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
  <div class="chip bg-paper-2 text-ink-soft" role="status"><CloudArrowDown size={14} aria-hidden="true" /> ออฟไลน์</div>
{:else if failed > 0}
  <div class="chip bg-danger-tint text-danger-ink" role="status"><WarningCircle size={14} aria-hidden="true" /> ซิงก์ล้มเหลว {failed}</div>
{:else if pending > 0}
  <div class="chip bg-pen-tint text-pen-ink" role="status"><CloudArrowDown size={14} aria-hidden="true" /> รอซิงก์ {pending}</div>
{:else}
  <div class="flex items-center gap-1.5 text-xs font-semibold text-ink-soft" role="status"><CloudCheck size={14} aria-hidden="true" /> ซิงก์แล้ว</div>
{/if}
