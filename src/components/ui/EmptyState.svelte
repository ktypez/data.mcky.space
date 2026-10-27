<script lang="ts">
  import type { Snippet } from 'svelte'
  let { title, body, action }: { title: string; body: string; action?: Snippet } = $props()
</script>

<div class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
  <p class="text-sm font-medium">{title}</p>
  <p class="max-w-xs text-xs text-muted-foreground">{body}</p>
  {@render action?.()}
</div>