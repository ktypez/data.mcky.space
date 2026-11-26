<script>
  import { onMount } from 'svelte';

  const shapes = ['star', 'hexagon', 'circle'];
  let shape = 'circle';
  let visible = true;
  let reduced = false;

  onMount(() => {
    // Pick once per page entry; never morph mid-animation.
    shape = shapes[Math.floor(Math.random() * shapes.length)];
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => (visible = false), reduced ? 100 : 1250);
    return () => window.clearTimeout(timer);
  });
</script>

{#if visible}
  <div class="entry" class:reduced aria-hidden="true">
    <div class="burst {shape}"></div>
    <div class="mark">
      <svg viewBox="0 0 24 24" fill="none">
        <g stroke="var(--pri)" stroke-width="2.6" stroke-linecap="round">
          <path d="M12 3v18" />
          <path d="M4.2 7.5 19.8 16.5" />
          <path d="M4.2 16.5 19.8 7.5" />
        </g>
      </svg>
    </div>
    <span class="dot d1"></span>
    <span class="dot d2"></span>
    <span class="dot d3"></span>
  </div>
{/if}

<style>
  /* Flat pastel whoosh — no gradients, no shadows. */
  .entry {
    position: fixed;
    inset: 0;
    z-index: 10000;
    overflow: hidden;
    pointer-events: none;
    isolation: isolate;
    contain: strict;
    background: var(--paper);
    animation: overlay 220ms ease-in 980ms both;
  }

  .burst {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 150vmax;
    height: 150vmax;
    background: var(--acc-soft);
    transform: translate(-50%, -50%) scale(.001);
    animation: whoosh 820ms cubic-bezier(.16, 1, .3, 1) 300ms both;
  }
  .star { clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 94%, 50% 72%, 21% 94%, 32% 57%, 2% 35%, 39% 35%); }
  .hexagon { clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); }
  .circle { border-radius: 50%; }

  .mark {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 50%;
    width: clamp(88px, 20vw, 132px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    animation: mark-in 320ms cubic-bezier(.22, 1, .36, 1) both,
               mark-out 260ms cubic-bezier(.4, 0, .2, 1) 560ms both;
  }
  .mark svg { display: block; width: 100%; height: 100%; overflow: visible; }

  .dot {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--acc);
    animation: dot-out 720ms cubic-bezier(.16, 1, .3, 1) 300ms both;
  }
  .d1 { --dx: 0px; --dy: -110px; background: var(--acc); }
  .d2 { --dx: 96px; --dy: 56px; background: var(--sec); }
  .d3 { --dx: -96px; --dy: 56px; background: var(--pri); }

  @keyframes mark-in {
    0% { opacity: 0; transform: translate(-50%, -44%) scale(.72) rotate(-24deg); }
    70% { opacity: 1; transform: translate(-50%, -51%) scale(1.08) rotate(4deg); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0); }
  }
  @keyframes mark-out {
    to { opacity: 0; transform: translate(-50%, -50%) scale(.9) rotate(14deg); }
  }
  @keyframes whoosh {
    0% { transform: translate(-50%, -50%) scale(.001); }
    100% { transform: translate(-50%, -50%) scale(1.45); }
  }
  @keyframes dot-out {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(.4); }
    40% { opacity: 1; }
    100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1); }
  }
  @keyframes overlay { to { opacity: 0; visibility: hidden; } }

  @media (prefers-reduced-motion: reduce) {
    .entry.reduced { animation: none; opacity: 0; }
    .entry.reduced .burst, .entry.reduced .mark, .entry.reduced .dot { animation: none; }
  }
</style>
