import { useEffect, useRef, useState } from 'react'

/**
 * V2RayCanvas — signature parametric widget for the catalog hero,
 * in the spirit of omarchy's hero ray: click to cycle patterns.
 *
 * Craft notes:
 * - rAF loop only while visible; static single frame under
 *   prefers-reduced-motion (click still cycles → redraws one frame).
 * - Colors resolve from the scoped v2 tokens and re-resolve when the
 *   shell's data-mode flips (MutationObserver), so light/dark just works.
 * - Canvas is devicePixelRatio-scaled for crisp lines.
 */

type DrawFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  c: { accent: string; line: string; faint: string },
) => void

const PATTERNS: { name: string; draw: DrawFn }[] = [
  {
    name: 'RAY',
    // Radar sweep: faint spokes + one bright rotating sector
    draw: (ctx, w, h, t, c) => {
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.42
      ctx.lineWidth = 1
      ctx.strokeStyle = c.faint
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        ctx.stroke()
      }
      ctx.strokeStyle = c.line
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      const a0 = (t * 0.0011) % (Math.PI * 2)
      ctx.strokeStyle = c.accent
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r)
      ctx.stroke()
      ctx.fillStyle = c.accent
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3)
    },
  },
  {
    name: 'WAVE',
    // Stacked phase-offset sines, top line accented
    draw: (ctx, w, h, t, c) => {
      const rows = 9
      for (let i = 0; i < rows; i++) {
        const y = (h / (rows + 1)) * (i + 1)
        const accentRow = i === Math.floor((t * 0.0006) % rows)
        ctx.strokeStyle = accentRow ? c.accent : c.faint
        ctx.lineWidth = accentRow ? 2 : 1
        ctx.beginPath()
        for (let x = 0; x <= w; x += 4) {
          const yy =
            y +
            Math.sin(x * 0.03 + t * 0.0016 + i * 0.7) *
              7 *
              Math.sin(t * 0.0008 + i)
          if (x === 0) ctx.moveTo(x, yy)
          else ctx.lineTo(x, yy)
        }
        ctx.stroke()
      }
    },
  },
  {
    name: 'ORBIT',
    // Lissajous trace with a comet head
    draw: (ctx, w, h, t, c) => {
      const cx = w / 2
      const cy = h / 2
      const rx = w * 0.36
      const ry = h * 0.34
      ctx.strokeStyle = c.faint
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.02) {
        const x = cx + Math.sin(a * 3 + Math.PI / 2) * rx
        const y = cy + Math.sin(a * 2) * ry
        if (a === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      const head = t * 0.0012
      ctx.strokeStyle = c.accent
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let k = 14; k >= 0; k--) {
        const a = head - k * 0.06
        const x = cx + Math.sin(a * 3 + Math.PI / 2) * rx
        const y = cy + Math.sin(a * 2) * ry
        if (k === 14) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      const hx = cx + Math.sin(head * 3 + Math.PI / 2) * rx
      const hy = cy + Math.sin(head * 2) * ry
      ctx.fillStyle = c.accent
      ctx.fillRect(hx - 2, hy - 2, 4, 4)
    },
  },
  {
    name: 'GRID',
    // Perspective floor grid with an accent pulse travelling into depth
    draw: (ctx, w, h, t, c) => {
      const horizon = h * 0.32
      ctx.strokeStyle = c.faint
      ctx.lineWidth = 1
      for (let i = 0; i <= 10; i++) {
        const x = (w / 10) * i
        ctx.beginPath()
        ctx.moveTo(w / 2 + (x - w / 2) * 0.25, horizon)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let j = 0; j < 8; j++) {
        const p = ((j + ((t * 0.00035) % 1)) / 8) ** 2.2
        const y = horizon + p * (h - horizon)
        const spread = 0.25 + p * 0.75
        ctx.strokeStyle = j === 7 ? c.accent : c.line
        ctx.beginPath()
        ctx.moveTo(w / 2 - (w / 2) * spread, y)
        ctx.lineTo(w / 2 + (w / 2) * spread, y)
        ctx.stroke()
      }
      ctx.strokeStyle = c.line
      ctx.beginPath()
      ctx.moveTo(0, horizon)
      ctx.lineTo(w, horizon)
      ctx.stroke()
    },
  },
]

export default function V2RayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [idx, setIdx] = useState(0)

  const colorsRef = useRef({ accent: '#ff5a36', line: '#28282c', faint: '#1c1c20' })
  const reducedRef = useRef(false)

  // Resolve token colors from the shell + track mode flips
  useEffect(() => {
    const shell = document.querySelector('.v2-shell')
    if (!shell) return
    const readColors = () => {
      const cs = getComputedStyle(shell)
      colorsRef.current = {
        accent: cs.getPropertyValue('--primary').trim() || '#ff5a36',
        line: cs.getPropertyValue('--border').trim() || '#28282c',
        faint: cs.getPropertyValue('--v2-line-soft').trim() || '#1c1c20',
      }
    }
    readColors()
    const mo = new MutationObserver(readColors)
    mo.observe(shell, { attributes: true, attributeFilter: ['data-mode'] })

    reducedRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    return () => mo.disconnect()
  }, [])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = canvas.width / dpr
    const H = canvas.height / dpr

    const render = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      PATTERNS[idx].draw(ctx, W, H, now, colorsRef.current)
    }

    let raf = 0
    if (reducedRef.current) {
      render(0) // single static frame
    } else {
      const loop = (now: number) => {
        render(now)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    return () => cancelAnimationFrame(raf)
  }, [idx])

  return (
    <button
      type="button"
      onClick={() => setIdx((i) => (i + 1) % PATTERNS.length)}
      className="group block w-full cursor-pointer border border-border bg-card p-2 text-left transition-colors hover:border-[color:var(--v2-line-strong)]"
      aria-label={`Cycle hero animation. Current: ${PATTERNS[idx].name}`}
    >
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        aria-hidden="true"
        className="block aspect-[4/3] w-full"
      />
      <span className="mt-1.5 flex items-center justify-between px-0.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        <span>
          {PATTERNS[idx].name} {String(idx + 1).padStart(2, '0')}/
          {String(PATTERNS.length).padStart(2, '0')}
        </span>
        <span className="opacity-50 transition-opacity group-hover:opacity-100">
          cycle ↻
        </span>
      </span>
    </button>
  )
}
