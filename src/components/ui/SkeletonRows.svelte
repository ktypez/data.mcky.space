<script lang="ts">
  let { count = 8 }: { count?: number } = $props()
</script>

<div class="space-y-2" aria-hidden>
  {#each Array.from({ length: count }) as _}
    <div class="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div class="size-10 animate-pulse rounded-lg bg-muted"></div>
      <div class="flex-1 space-y-2">
        <div class="h-3 w-1/2 animate-pulse rounded bg-muted"></div>
        <div class="h-2.5 w-3/4 animate-pulse rounded bg-muted"></div>
      </div>
    </div>
  {/each}
</div>