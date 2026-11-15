<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  let visible = $state(true)
  let canvas = $state<HTMLCanvasElement>()

  onMount(() => {
    let disposed = false
    let frame = 0
    let renderer: import('three').WebGLRenderer | undefined
    let observer: ResizeObserver | undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    void import('three').then((THREE) => {
      if (disposed || !canvas) return
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        renderer.setClearColor(0x000000, 0)
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
        camera.position.z = 6
        const group = new THREE.Group()
        scene.add(group)

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.12, 0.012, 8, 120),
          new THREE.MeshBasicMaterial({ color: 0x158068, transparent: true, opacity: 0.48 }),
        )
        ring.rotation.set(0.72, 0.24, -0.4)
        group.add(ring)

        const ringInner = new THREE.Mesh(
          new THREE.TorusGeometry(0.78, 0.009, 8, 100),
          new THREE.MeshBasicMaterial({ color: 0x158068, transparent: true, opacity: 0.28 }),
        )
        ringInner.rotation.set(1.18, -0.35, 0.2)
        group.add(ringInner)

        const points = new THREE.BufferGeometry()
        const positions = new Float32Array(180 * 3)
        for (let i = 0; i < 180; i++) {
          const theta = Math.random() * Math.PI * 2
          const radius = 1.35 + Math.random() * 1.2
          positions[i * 3] = Math.cos(theta) * radius
          positions[i * 3 + 1] = Math.sin(theta) * radius
          positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4
        }
        points.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        group.add(new THREE.Points(points, new THREE.PointsMaterial({ color: 0x158068, size: 0.018, transparent: true, opacity: 0.45 })))

        const resize = () => {
          if (!canvas || !renderer) return
          const { width, height } = canvas.getBoundingClientRect()
          if (!width || !height) return
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.render(scene, camera)
        }
        observer = new ResizeObserver(resize)
        observer.observe(canvas)
        resize()

        const animate = (time: number) => {
          if (disposed || !renderer) return
          if (!reducedMotion) {
            group.rotation.y = time * 0.00012
            group.rotation.x = Math.sin(time * 0.00018) * 0.07
          }
          renderer.render(scene, camera)
          if (!reducedMotion) frame = requestAnimationFrame(animate)
        }
        if (!reducedMotion) frame = requestAnimationFrame(animate)
      } catch {
        // Keep the typographic splash usable when WebGL is unavailable.
      }
    }).catch(() => {
      // The splash remains useful without the optional 3D animation.
    })

    const dismiss = window.setTimeout(() => (visible = false), reducedMotion ? 450 : 1250)
    return () => {
      disposed = true
      window.clearTimeout(dismiss)
      cancelAnimationFrame(frame)
      observer?.disconnect()
      renderer?.dispose()
    }
  })
</script>

{#if visible}
  <div class="loading-splash" role="status" aria-label="กำลังเปิด DATA Ledger" transition:fade={{ duration: 260 }}>
    <canvas bind:this={canvas} class="loading-splash-canvas" aria-hidden="true"></canvas>
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
  .loading-splash::before {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(var(--rule, #d7d2c8) 0.7px, transparent 0.7px);
    background-size: 22px 22px;
    opacity: 0.24;
    content: '';
  }
  .loading-splash-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
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
  }
</style>
