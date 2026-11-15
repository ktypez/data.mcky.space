<script lang="ts">
  import { onMount } from 'svelte'

  type RevealShape = {
    x: number
    y: number
    path: string
    delay: number
    scale: number
  }

  let visible = $state(true)
  let shapes = $state<RevealShape[]>([])

  function createBlobPath(radius: number): string {
    const points = Array.from({ length: 12 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 12
      const wobble = 0.76 + Math.random() * 0.42
      return {
        x: Math.cos(angle) * radius * wobble,
        y: Math.sin(angle) * radius * wobble,
      }
    })

    const midpoint = (a: (typeof points)[number], b: (typeof points)[number]) => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    })

    let path = ''
    const first = midpoint(points[points.length - 1], points[0])
    path += `M ${first.x} ${first.y} `

    for (let index = 0; index < points.length; index += 1) {
      const current = points[index]
      const next = points[(index + 1) % points.length]
      const end = midpoint(current, next)
      path += `Q ${current.x} ${current.y} ${end.x} `
    }

    return path + 'Z'
  }

  onMount(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      const timer = window.setTimeout(() => (visible = false), 90)
      return () => window.clearTimeout(timer)
    }

    // A loose 3×3 field makes the reveal cover the whole viewport while
    // keeping each organic mask shape independently timed and positioned.
    const anchors = [0, 50, 100]
    shapes = anchors.flatMap((anchorY) =>
      anchors.map((anchorX) => ({
        x: Math.max(0, Math.min(100, anchorX + (Math.random() - 0.5) * 13)),
        y: Math.max(0, Math.min(100, anchorY + (Math.random() - 0.5) * 13)),
        path: createBlobPath(8.5 + Math.random() * 3.5),
        delay: Math.round(Math.random() * 360),
        scale: 8.5 + Math.random() * 2.5,
      })),
    )

    const dismiss = window.setTimeout(() => (visible = false), 2050)
    return () => window.clearTimeout(dismiss)
  })
</script>

{#if visible}
  <div class="entry-reveal" aria-hidden="true">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id="entry-reveal-surface" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--paper, #f6f2e9)" />
          <stop offset="100%" stop-color="var(--paper-2, #eee9dd)" />
        </linearGradient>
        <mask id="entry-reveal-mask" x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="white" />
          {#each shapes as shape, index (index)}
            <g transform="translate({shape.x} {shape.y})">
              <path
                class="reveal-blob"
                d={shape.path}
                fill="black"
                style={`--reveal-delay: ${shape.delay}ms; --reveal-scale: ${shape.scale};`}
              />
            </g>
          {/each}
        </mask>
      </defs>
      <rect width="100" height="100" fill="url(#entry-reveal-surface)" mask="url(#entry-reveal-mask)" />
    </svg>
  </div>
{/if}

<style>
  .entry-reveal {
    position: fixed;
    inset: 0;
    z-index: 10000;
    overflow: hidden;
    pointer-events: none;
    background: var(--paper, #f6f2e9);
    contain: strict;
  }

  .entry-reveal svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .reveal-blob {
    transform-box: fill-box;
    transform-origin: center;
    animation: organic-reveal 1450ms cubic-bezier(0.2, 0.72, 0.18, 1) var(--reveal-delay) both;
    will-change: transform;
  }

  @keyframes organic-reveal {
    from { transform: scale(0.01) rotate(-12deg); }
    to { transform: scale(var(--reveal-scale)) rotate(18deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal-blob { animation: none; }
  }
</style>
