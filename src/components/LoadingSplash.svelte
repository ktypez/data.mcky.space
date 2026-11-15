<script lang="ts">
  import { onMount } from 'svelte'

  const shapes = ['star', 'hexagon', 'circle', 'triangle'] as const
  let shape = $state<(typeof shapes)[number]>('circle')
  let visible = $state(true)
  let reducedMotion = false

  onMount(() => {
    shape = shapes[Math.floor(Math.random() * shapes.length)]
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
    <div
      class="geometry"
      class:shape-star={shape === 'star'}
      class:shape-hexagon={shape === 'hexagon'}
      class:shape-circle={shape === 'circle'}
      class:shape-triangle={shape === 'triangle'}
    ></div>
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
    z-index: 1;
    width: 120vmax;
    height: 120vmax;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(0.001) rotate(-18deg);
    transform-origin: center;
    will-change: transform;
    background: var(--pop, #f2593f);
    animation: geometry-zoom 1180ms cubic-bezier(0.12, 0.82, 0.18, 1) both;
  }

  /* Exactly one randomly selected shape per page entry. */
  .shape-star {
    background: var(--pop, #f2593f);
    clip-path: polygon(
      50% 0, 61% 35%, 98% 35%, 68% 57%,
      79% 94%, 50% 72%, 21% 94%, 32% 57%,
      2% 35%, 39% 35%
    );
  }

  .shape-hexagon {
    background: var(--paper, #f6f2e9);
    clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  }

  .shape-circle {
    background: var(--ink, #28251d);
    border-radius: 50%;
  }

  .shape-triangle {
    background: var(--paper, #f6f2e9);
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  .negative-flash {
    position: absolute;
    z-index: 2;
    inset: 0;
    background: #fff;
    mix-blend-mode: difference;
    opacity: 0;
    animation: negative-hit 420ms steps(2, end) both;
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
