<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    active = false,
    class: className = '',
    onclick,
    children,
    ...rest
  }: {
    active?: boolean
    class?: string
    onclick?: (e: MouseEvent) => void
    children?: Snippet
    [key: string]: unknown
  } = $props()
</script>

<button type="button" class="seg-item {className}" aria-pressed={active} {onclick} {...rest}>
  {@render children?.()}
</button>
