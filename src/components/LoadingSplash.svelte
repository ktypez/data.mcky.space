<script lang="ts">
  import { onMount } from 'svelte'

  let visible = $state(true)
  let exiting = $state(false)

  onMount(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dismiss = window.setTimeout(() => {
      exiting = true
      window.setTimeout(() => (visible = false), reducedMotion ? 40 : 1000)
    }, reducedMotion ? 250 : 750)
    return () => window.clearTimeout(dismiss)
  })
</script>

{#if visible}
  <div
    class="loading-splash"
    role="status"
    aria-label="กำลังเปิด DATA Ledger"
    class:sheet-fade={exiting}
  ></div>
{/if}

<style>
  .loading-splash {
    position: fixed;
    inset: 0;
    z-index: 10000;
    overflow: hidden;
    pointer-events: none;
    background: var(--paper, #f6f2e9);
  }

  .loading-splash::before {
    position: absolute;
    inset: 0;
    background-color: var(--paper, #f6f2e9);
    background-image:
      radial-gradient(color-mix(in srgb, var(--ink, #20231f) 52%, transparent) 0.65px, transparent 0.9px),
      linear-gradient(90deg,
        color-mix(in srgb, var(--ink, #20231f) 7%, transparent),
        transparent 30% 70%,
        color-mix(in srgb, var(--ink, #20231f) 7%, transparent));
    background-size: 4px 4px, 100% 100%;
    content: '';
  }

  .loading-splash.sheet-fade::before {
    animation: grain-sheet-fade 1000ms steps(18, end) both;
  }

  @keyframes grain-sheet-fade {
    0% { opacity: 1; filter: contrast(1.25); }
    35% { opacity: 0.92; filter: contrast(1.5); }
    100% { opacity: 0; filter: contrast(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-splash.sheet-fade::before {
      animation-duration: 40ms;
      animation-timing-function: linear;
    }
  }
</style>
