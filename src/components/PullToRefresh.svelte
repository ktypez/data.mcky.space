<script lang="ts">
  /**
   * Pull-to-refresh indicator component
   * Shows a spinner when user pulls down or refreshing is in progress
   */
  import { onDestroy } from 'svelte'
  import { setupPullToRefresh } from '@/lib/pull-to-refresh'
  import type { Snippet } from 'svelte'

  let {
    onRefresh,
    getScrollElement,
    threshold = 80,
    children,
  }: {
    onRefresh: () => Promise<void> | void
    getScrollElement: () => HTMLElement | null | undefined
    threshold?: number
    children: Snippet
  } = $props()

  let containerEl: HTMLDivElement
  let ptr = setupPullToRefresh({ 
    onRefresh: () => onRefresh(),
    getScrollElement: () => getScrollElement(),
    threshold: threshold ?? 80
  })

  $effect(() => {
    if (containerEl) {
      ptr.setContainer(containerEl)
    }
  })

  onDestroy(() => {
    ptr.destroy()
  })
</script>

<div
  bind:this={containerEl}
  class="ptr-container relative"
  style="--ptr-progress: 0; --ptr-y: 0px;"
>
  <!-- Pull indicator -->
  <div
    class="ptr-indicator pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-center py-3 transition-transform duration-300"
    style="transform: translateY(var(--ptr-y)); opacity: var(--ptr-progress);"
    aria-hidden="true"
  >
    <!-- Spinner -->
    <span
      class="ptr-spinner h-5 w-5 rounded-full border-2 border-primary border-t-transparent"
      class:bg-background={true}
    ></span>
  </div>
  
  <!-- Content -->
  {@render children()}
</div>

<style>
  .ptr-container {
    touch-action: pan-y;
  }

  :global(.ptr-refreshing) .ptr-spinner {
    animation: spin 0.8s linear infinite;
  }

  :global(.ptr-refreshing) .ptr-indicator {
    opacity: 1 !important;
  }

  .ptr-spinner {
    transition: transform 0.3s ease;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
