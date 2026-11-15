<script lang="ts">
  import { onMount } from 'svelte'

  let canvas: HTMLCanvasElement

  onMount(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    let frame = 0
    let width = 0
    let height = 0
    let dpr = 1
    let cells: Array<{ x: number; y: number; delay: number; drift: number; hue: number; lightness: number }> = []
    let startedAt = 0
    let disposed = false

    const cellSize = 14
    const duration = reducedMotion ? 220 : 1480
    const cornerX = () => width + 24
    const cornerY = () => -24

    function buildGrid() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      context!.setTransform(dpr, 0, 0, dpr, 0, 0)

      cells = []
      for (let y = 0; y < height; y += cellSize) {
        for (let x = 0; x < width; x += cellSize) {
          const nx = x / Math.max(width, 1)
          const ny = y / Math.max(height, 1)
          const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
          cells.push({
            x,
            y,
            delay: hash * 0.24,
            drift: 0.82 + hash * 0.5,
            hue: 218 + nx * 48 - ny * 10,
            lightness: 30 + ny * 28 + nx * 8,
          })
        }
      }
    }

    function draw(now: number) {
      if (disposed) return
      if (!startedAt) startedAt = now
      const progress = Math.min(1, (now - startedAt) / duration)

      context!.clearRect(0, 0, width, height)
      for (const cell of cells) {
        const local = Math.max(0, Math.min(1, (progress - cell.delay) / (1 - cell.delay)))
        const eased = local * local * (3 - 2 * local)
        const x = cell.x + (cornerX() - cell.x) * eased * cell.drift
        const y = cell.y + (cornerY() - cell.y) * eased * cell.drift
        const size = cellSize * (1 - eased * 0.94)
        const alpha = 1 - eased
        if (alpha <= 0.015) continue

        context!.globalAlpha = alpha
        context!.fillStyle = `hsl(${cell.hue} 48% ${cell.lightness}%)`
        context!.fillRect(x, y, size, size)
      }
      context!.globalAlpha = 1

      if (progress < 1) frame = requestAnimationFrame(draw)
      else canvas.remove()
    }

    buildGrid()
    const resize = () => {
      cancelAnimationFrame(frame)
      buildGrid()
      startedAt = performance.now() - Math.min(duration * 0.35, 420)
      frame = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', resize, { passive: true })
    frame = requestAnimationFrame(draw)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  })
</script>

<canvas bind:this={canvas} class="pixel-transition" aria-hidden="true" />

<style>
  .pixel-transition {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: block;
    pointer-events: none;
    image-rendering: pixelated;
    contain: strict;
  }
</style>
