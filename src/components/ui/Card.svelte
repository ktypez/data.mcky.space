<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    right,
    pad = true,
    class: className = '',
    children,
  }: {
    title?: string
    right?: Snippet
    pad?: boolean
    class?: string
    children?: Snippet
  } = $props()
</script>

<section class="card {className}">
  {#if title}
    <div class="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
      <h2 class="label !mb-0">{title}</h2>
      {#if right}{@render right()}{/if}
    </div>
  {/if}
  {#if pad}<div class="card-pad">{@render children?.()}</div>{:else}{@render children?.()}{/if}
</section>
