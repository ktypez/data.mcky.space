<script lang="ts">
  import { onMount } from 'svelte'

  let visible = $state(true)
  let sweeping = $state(false)

  onMount(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const begin = window.setTimeout(() => (sweeping = true), reducedMotion ? 200 : 650)
    const dismiss = window.setTimeout(() => (visible = false), reducedMotion ? 260 : 1950)
    return () => {
      window.clearTimeout(begin)
      window.clearTimeout(dismiss)
    }
  })
</script>

{#if visible}
  <div
    class="loading-splash"
    class:sweeping
    role="status"
    aria-label="กำลังเปิด DATA Ledger"
  >
    <div class="halftone-sheet" aria-hidden="true"></div>
  </div>
{/if}

<style>
  .loading-splash {
    position: fixed;
    inset: 0;
    z-index: 10000;
    overflow: hidden;
    pointer-events: none;
    background: var(--paper, #f6f2e9);
    --reveal: 100%;
  }

  .halftone-sheet {
    position: absolute;
    inset: 0;
    background-color: var(--paper, #f6f2e9);
    background-image:
      radial-gradient(circle, color-mix(in srgb, var(--ink, #20231f) 82%, transparent) 0.85px, transparent 1.15px),
      linear-gradient(90deg,
        color-mix(in srgb, var(--ink, #20231f) 10%, transparent),
        transparent 32% 68%,
        color-mix(in srgb, var(--ink, #20231f) 10%, transparent));
    background-size: 5px 5px, 100% 100%;
    background-position: center, center;
    -webkit-mask-image: linear-gradient(90deg,
      #000 0%, #000 var(--reveal, 100%), transparent calc(var(--reveal, 100%) + 8%), transparent 100%);
    mask-image: linear-gradient(90deg,
      #000 0%, #000 var(--reveal, 100%), transparent calc(var(--reveal, 100%) + 8%), transparent 100%);
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    will-change: -webkit-mask-image, mask-image, background-position;
  }

  @property --reveal {
    syntax: '<percentage>';
    inherits: true;
    initial-value: 100%;
  }

  .loading-splash.sweeping .halftone-sheet {
    animation: halftone-run 1300ms linear both, grain-drift 1300ms linear both;
  }

  @keyframes halftone-run {
    0% { --reveal: 100%; }
    100% { --reveal: 0%; }
  }

  @keyframes grain-drift {
    0% { background-position: center, center; }
    100% { background-position: 48px 0, center; }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-splash.sweeping .halftone-sheet { animation-duration: 40ms; }
  }
</style>
