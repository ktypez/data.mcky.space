<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    label,
    hint,
    id,
    class: className = '',
    children,
  }: {
    label: string
    hint?: string
    id?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

<div class="min-w-0 {className}">
  <span class="label" {id}>{label}</span>
  {@render children?.()}
  {#if hint}<p class="mt-2 text-[11.5px] text-ink-faint">{hint}</p>{/if}
</div>
