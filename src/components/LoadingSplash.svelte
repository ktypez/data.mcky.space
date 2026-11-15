<script lang="ts">
  import { onMount } from 'svelte'

  let canvas: HTMLCanvasElement

  onMount(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    type Pixel = {
      x: number
      y: number
      delay: number
      drift: number
      tone: number
      size: number
    }

    let frame = 0
    let width = 0
    let height = 0
    let dpr = 1
    let pixels: Pixel[] = []
    let startedAt = 0
    let disposed = false

    const cellSize = 12
    const duration = reducedMotion ? 220 : 1560
    const targetX = () => width + 28
    const targetY = () => -28

    // Stable noise keeps the texture consistent between animation frames.
    function noise(x: number, y: number) {
      const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
      return value - Math.floor(value)
    }

    function buildGrid() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      context!.setTransform(dpr, 0, 0, dpr, 0, 0)

      pixels = []
      for (let y = 0; y < height; y += cellSize) {
        for (let x = 0; x < width; x += cellSize) {
          const random = noise(x, y)
          const nx = x / Math.max(width, 1)
          const ny = y / Math.max(height, 1)

          // A restrained monochrome gradient, with grain-like tonal variation.
          const gradient = 9 + nx * 23 + ny * 17
          const tone = Math.max(2, Math.min(78, gradient + (random - 0.5) * 25))
          const distanceToCorner = Math.hypot(1 - nx, ny) / Math.SQRT2

          pixels.push({
            x,
            y,
            delay: Math.min(0.34, distanceToCorner * 0.16 + random * 0.2),
            drift: 0.84 + random * 0.42,
            tone,
            size: cellSize + random * 2.2,
          })
        }
      }
    }

    function draw(now: number) {
      if (disposed) return
      if (!startedAt) startedAt = now
      const progress = Math.min(1, (now - startedAt) / duration)

      context!.clearRect(0, 0, width, height)

      for (const pixel of pixels) {
        const local = Math.max(0, Math.min(1, (progress - pixel.delay) / (1 - pixel.delay)))
        const eased = local * local * (3 - 2 * local)
        const x = pixel.x + (targetX() - pixel.x) * eased * pixel.drift
        const y = pixel.y + (targetY() - pixel.y) * eased * pixel.drift
        const scale = 1 - eased * 0.96
        const alpha = 1 - eased

        if (alpha <= 0.012) continue

        context!.globalAlpha = alpha
        context!.fillStyle = `rgb(${pixel.tone}, ${pixel.tone}, ${pixel.tone})`
        // Slight overlap prevents seams in the full-screen cover at rest.
        context!.fillRect(x, y, pixel.size * scale + 0.6, pixel.size * scale + 0.6)
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
