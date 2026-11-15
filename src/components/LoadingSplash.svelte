<script lang="ts">
  import { onMount } from 'svelte'

  let visible = $state(true)
  let reducedMotion = false

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      const timer = window.setTimeout(() => (visible = false), 100)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => (visible = false), 1580)
    return () => window.clearTimeout(timer)
  })
</script>

{#if visible}
  <div
    class="entry-reveal"
    class:reduced={reducedMotion}
    aria-hidden="true"
  >
    <div class="geometry geometry--circle"></div>
    <div class="geometry geometry--diamond"></div>
    <div class="geometry geometry--burst"></div>
    <div class="geometry geometry--ring"></div>
    <div class="negative-flash"></div>
  </div>
{/if}

<style>
  .entry-reveal {
    position: fixed;
    inset: 0;
    z-index: 10000;
    overflow: hidden;
    pointer-events: none;
    isolation: isolate;
    background: var(--acc, #158068);
    animation: overlay-exit 260ms ease-in 1290ms both;
    contain: strict;
  }

  .geometry {
    position: absolute;
    width: 120vmax;
    height: 120vmax;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(0.001) rotate(-18deg);
    transform-origin: center;
    will-change: transform;
    animation: geometry-zoom 1180ms cubic-bezier(0.12, 0.82, 0.18, 1) both;
  }

  /* Bright theme/negative contrast: each shape bursts from the exact center. */
  .geometry--circle {
    z-index: 1;
    border-radius: 50%;
    background: var(--paper, #f6f2e9);
    animation-delay: 0ms;
  }

  .geometry--diamond {
    z-index: 2;
    background: var(--ink, #28251d);
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    animation-delay: 65ms;
    animation-duration: 1220ms;
    transform: translate(-50%, -50%) scale(0.001) rotate(0deg);
  }

  .geometry--burst {
    z-index: 3;
    background: var(--pop, #f2593f);
    clip-path: polygon(
      50% 0, 61% 34%, 88% 12%, 72% 43%,
      100% 50%, 70% 61%, 88% 88%, 58% 72%,
      50% 100%, 39% 70%, 12% 88%, 28% 58%,
      0 50%, 30% 39%, 12% 12%, 42% 28%
    );
    animation-delay: 125ms;
    animation-duration: 1260ms;
    transform: translate(-50%, -50%) scale(0.001) rotate(-24deg);
  }

  .geometry--ring {
    z-index: 4;
    width: 76vmax;
    height: 76vmax;
    border: clamp(18px, 4vmin, 54px) solid var(--danger, #d9453a);
    border-radius: 50%;
    animation-delay: 190ms;
    animation-duration: 1120ms;
    transform: translate(-50%, -50%) scale(0.001) rotate(0);
  }

  .negative-flash {
    position: absolute;
    z-index: 5;
    inset: 0;
    background: #fff;
    mix-blend-mode: difference;
    opacity: 0;
    animation: negative-hit 420ms steps(2, end) 0ms both;
  }

  @keyframes geometry-zoom {
    0% {
      transform: translate(-50%, -50%) scale(0.001) rotate(-18deg);
    }
    72% {
      transform: translate(-50%, -50%) scale(1.18) rotate(8deg);
    }
    100% {
      transform: translate(-50%, -50%) scale(1.65) rotate(0deg);
    }
  }

  @keyframes negative-hit {
    0% { opacity: 0; }
    10% { opacity: 0.9; }
    24% { opacity: 0.2; }
    38% { opacity: 0.65; }
    100% { opacity: 0; }
  }

  @keyframes overlay-exit {
    to { opacity: 0; visibility: hidden; }
  }

  @media (prefers-reduced-motion: reduce) {
    .entry-reveal.reduced {
      animation: none;
      opacity: 0;
    }
    .entry-reveal.reduced .geometry,
    .entry-reveal.reduced .negative-flash {
      animation: none;
    }
  }
</style>
