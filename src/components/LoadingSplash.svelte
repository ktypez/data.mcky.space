<script lang="ts">
  import { onMount } from 'svelte'

  const pixelTiles = Array.from({ length: 192 }, (_, i) => {
    const column = i % 16
    const row = Math.floor(i / 16)
    // A seeded shuffle spreads the dissolve across the whole screen, not as a wipe.
    const seed = ((i * 73 + row * 29 + column * 47) % 191) / 191
    return {
      x: column * 6.25,
      y: row * 8.333,
      delay: seed * 0.42,
      driftX: ((i * 17) % 31) - 15,
      driftY: ((i * 23) % 37) - 18,
      grain: i % 3 === 0,
      shade: Math.abs(column - 7.5) / 7.5,
    }
  })

  let visible = $state(true)
  let exiting = $state(false)

  onMount(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dismiss = window.setTimeout(() => {
      exiting = true
      window.setTimeout(() => (visible = false), reducedMotion ? 40 : 900)
    }, reducedMotion ? 300 : 850)
    return () => window.clearTimeout(dismiss)
  })
</script>

{#if visible}
  <div class="loading-splash" role="status" aria-label="กำลังเปิด DATA Ledger" class:pixel-exit={exiting}>
    <div class="loading-splash-tiles" aria-hidden="true">
      {#each pixelTiles as tile}
        <i
          class:grain={tile.grain}
          style={`--x:${tile.x}%;--y:${tile.y}%;--delay:${tile.delay}s;--dx:${tile.driftX}px;--dy:${tile.driftY}px;--shade:${tile.shade}`}
        ></i>
      {/each}
    </div>
    <div class="loading-splash-content">
      <span class="loading-splash-mark" aria-hidden="true">D</span>
      <span class="loading-splash-name">DATA<span> / </span>LEDGER</span>
      <span class="loading-splash-caption">YOUR COLLECTION, IN ORDER</span>
      <span class="loading-splash-progress" aria-hidden="true"><i></i></span>
    </div>
  </div>
{/if}

<style>
  .loading-splash {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: var(--paper, #f6f2e9);
    color: var(--ink, #20231f);
  }
  .loading-splash-tiles { position: absolute; inset: 0; }
  .loading-splash-tiles i {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: 6.3%;
    height: 8.4%;
    border: 1px solid color-mix(in srgb, var(--rule, #d7d2c8) 40%, transparent);
    background-color: color-mix(in srgb, var(--paper, #f6f2e9) calc(88% + var(--shade) * 12%), var(--acc, #158068));
    background-image: radial-gradient(color-mix(in srgb, var(--ink, #20231f) 38%, transparent) 0.65px, transparent 0.9px);
    background-size: 4px 4px;
    opacity: 0;
    will-change: opacity, transform;
  }
  .loading-splash-tiles i.grain {
    background-size: 3px 3px;
  }
  .loading-splash.pixel-exit { background: transparent; pointer-events: none; }
  .loading-splash.pixel-exit .loading-splash-tiles i {
    opacity: 1;
    animation: pixel-break 700ms steps(7, end) var(--delay) both;
  }
  .loading-splash.pixel-exit .loading-splash-content {
    animation: mark-break 350ms ease-in forwards;
  }
  .loading-splash-content {
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 12px;
  }
  .loading-splash-mark {
    display: grid;
    width: 76px;
    height: 76px;
    place-items: center;
    border: 1px solid var(--acc, #158068);
    color: var(--acc, #158068);
    font-family: var(--font-mono, monospace);
    font-size: 44px;
    font-weight: 700;
    line-height: 1;
    box-shadow: 4px 4px 0 var(--acc, #158068);
    animation: splash-mark-in 500ms cubic-bezier(.2,.8,.2,1) both;
  }
  .loading-splash-name {
    margin-top: 7px;
    font-family: var(--font-display, var(--font-ui, sans-serif));
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.12em;
  }
  .loading-splash-name span { color: var(--acc, #158068); }
  .loading-splash-caption {
    color: var(--ink-soft, #77776f);
    font-family: var(--font-mono, monospace);
    font-size: 9px;
    letter-spacing: 0.18em;
  }
  .loading-splash-progress {
    width: 96px;
    height: 2px;
    margin-top: 8px;
    overflow: hidden;
    background: var(--rule, #d7d2c8);
  }
  .loading-splash-progress i {
    display: block;
    width: 45%;
    height: 100%;
    background: var(--acc, #158068);
    animation: splash-progress 1.1s ease-in-out infinite;
  }
  @keyframes pixel-break {
    0% { opacity: 1; transform: translate(0, 0) scale(1); }
    55% { opacity: 1; }
    100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.35); }
  }
  @keyframes mark-break { to { opacity: 0; transform: scale(1.08); filter: blur(5px); } }
  @keyframes splash-mark-in {
    from { opacity: 0; transform: translateY(8px) scale(.92); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes splash-progress {
    from { transform: translateX(-110%); }
    to { transform: translateX(230%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-splash-mark, .loading-splash-progress i { animation: none; }
    .loading-splash.pixel-exit .loading-splash-tiles i { animation-duration: 40ms; animation-delay: 0ms; }
  }
</style>
