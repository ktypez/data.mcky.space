<script lang="ts">
  import { toasts, dismissToast } from '@/lib/toast'
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 min-[900px]:bottom-6" aria-live="polite">
  {#each $toasts as t (t.id)}
    <div
      role="status"
      class="sticker pop-dots pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-[13.5px] font-semibold text-ink"
    >
      <span class="min-w-0 flex-1">{t.message}</span>
      {#if t.actionLabel && t.onAction}
        <button type="button" onclick={() => { t.onAction?.(); dismissToast(t.id) }} class="min-h-11 shrink-0 px-1 font-bold text-acc-ink underline underline-offset-[3px]">{t.actionLabel}</button>
      {/if}
    </div>
  {/each}
</div>
