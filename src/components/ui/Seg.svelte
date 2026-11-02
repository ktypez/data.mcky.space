<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    label,
    class: className = '',
    children,
  }: {
    label?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

<div class="seg {className}" role="group" aria-label={label}>
  {@render children?.()}
</div>
