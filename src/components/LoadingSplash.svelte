<script lang="ts">
  import { onMount } from 'svelte'

  const shapes = ['star', 'hexagon', 'circle', 'triangle'] as const
  let shape = $state<(typeof shapes)[number]>('circle')
  let visible = $state(true)
  let reducedMotion = $state(false)

  onMount(() => {
    // Pick once per full page entry; never change shape during the animation.
    shape = shapes[Math.floor(Math.random() * shapes.length)]
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const duration = reducedMotion ? 100 : 1200
    const timer = window.setTimeout(() => (visible = false), duration)
    return () => window.clearTimeout(timer)
  })
</script>

{#if visible}
  <div
    class="entry-reveal"
    class:reduced={reducedMotion}
    aria-hidden="true"
  >
    <div class="mascot">
      <svg viewBox="0 0 96 96" role="presentation">
        <path class="mascot-antenna" d="M48 17V9" />
        <circle class="mascot-tip" cx="48" cy="7" r="4" />
        <rect class="mascot-body" x="17" y="22" width="62" height="58" rx="21" />
        <circle class="mascot-eye" cx="37" cy="47" r="4" />
        <circle class="mascot-eye" cx="59" cy="47" r="4" />
        <path class="mascot-mouth" d="M39 61Q48 69 57 61" />
        <path class="mascot-foot" d="M31 79v5M65 79v5" />
      </svg>
    </div>

    <div
      class="geometry"
      class:shape-star={shape === 'star'}
      class:shape-hexagon={shape === 'hexagon'}
      class:shape-circle={shape === 'circle'}
      class:shape-triangle={shape === 'triangle'}
    ></div>
  </div>
{/if}

<style>
  .entry-reveal {
    --entry-color: var(--pri);
    position: fixed;
    inset: 0;
    z-index: 10000;
    overflow: hidden;
    pointer-events: none;
    isolation: isolate;
    contain: strict;
    background: var(--paper, #fffdf8);
    /* Fade begins before the shape finishes expanding: no pause at full size. */
    animation: overlay-whoosh 250ms ease-in 950ms both;
  }

  .mascot {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 50%;
    width: clamp(76px, 18vw, 112px);
    aspect-ratio: 1;
    color: var(--entry-color);
    transform: translate(-50%, -50%);
    animation:
      mascot-intro 350ms cubic-bezier(.22, 1, .36, 1) both,
      mascot-exit 200ms cubic-bezier(.4, 0, .2, 1) 350ms both;
  }

  .mascot svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .mascot-body {
    fill: var(--entry-color);
  }

  .mascot-antenna,
  .mascot-foot,
  .mascot-mouth {
    fill: none;
    stroke: var(--entry-color);
    stroke-width: 5;
    stroke-linecap: round;
  }

  .mascot-tip {
    fill: var(--entry-color);
  }

  .mascot-eye {
    fill: var(--paper, #fffdf8);
  }

  .mascot-mouth {
    stroke: var(--paper, #fffdf8);
    stroke-width: 3.5;
  }

  .geometry {
    position: absolute;
    z-index: 1;
    left: 50%;
    top: 50%;
    width: 150vmax;
    height: 150vmax;
    background: var(--entry-color);
    transform: translate(-50%, -50%) scale(.001);
    transform-origin: center;
    will-change: transform;
    /* Quick, eased expansion starts as the mascot exits and runs into the fade. */
    animation: shape-whoosh 850ms cubic-bezier(.16, 1, .3, 1) 350ms both;
  }

  .shape-star {
    clip-path: polygon(
      50% 0, 61% 35%, 98% 35%, 68% 57%,
      79% 94%, 50% 72%, 21% 94%, 32% 57%,
      2% 35%, 39% 35%
    );
  }

  .shape-hexagon {
    clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  }

  .shape-circle {
    border-radius: 50%;
  }

  .shape-triangle {
    clip-path: polygon(50% 0, 93.3% 75%, 6.7% 75%);
  }

  @keyframes mascot-intro {
    0% { opacity: 0; transform: translate(-50%, -44%) scale(.78); }
    72% { opacity: 1; transform: translate(-50%, -51%) scale(1.04); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  @keyframes mascot-exit {
    to { opacity: 0; transform: translate(-50%, -50%) scale(.9); }
  }

  @keyframes shape-whoosh {
    0% { transform: translate(-50%, -50%) scale(.001); }
    100% { transform: translate(-50%, -50%) scale(1.5); }
  }

  @keyframes overlay-whoosh {
    to { opacity: 0; visibility: hidden; }
  }

  @media (prefers-reduced-motion: reduce) {
    .entry-reveal.reduced {
      animation: none;
      opacity: 0;
    }
    .entry-reveal.reduced .mascot,
    .entry-reveal.reduced .geometry {
      animation: none;
    }
  }
</style>
