<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    active = false,
    count,
    class: className = '',
    onclick,
    children,
    ...rest
  }: {
    active?: boolean
    count?: number | string
    class?: string
    onclick?: (e: MouseEvent) => void
    children?: Snippet
    [key: string]: unknown
  } = $props()
</script>

<button
  type="button"
  aria-pressed={active}
  {onclick}
  class="chip cursor-pointer !py-1.5 transition-all duration-150 {active
    ? 'border-pri bg-pri-soft text-pri-ink shadow-sm'
    : 'border-rule bg-card text-ink-soft hover:-translate-y-px hover:border-rule-2 hover:text-ink'} {className}"
  {...rest}
>
  {@render children?.()}
  {#if count !== undefined}
    <span class="rounded-full px-1.5 font-mono text-[10.5px] font-bold {active ? 'bg-card/70 text-pri-ink' : 'bg-paper-2 text-ink-faint'}">{count}</span>
  {/if}
</button>
