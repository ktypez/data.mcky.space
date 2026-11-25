<script>
  import { bursts } from '../lib/effects.js';

  const COLORS = {
    pri: 'var(--pri)',
    acc: 'var(--acc)',
    ok: 'hsl(150 62% 46%)',
    info: 'hsl(212 80% 56%)',
    warn: 'hsl(36 95% 54%)',
    default: 'var(--ink)'
  };

  function spikes(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r1 = 12, r2 = 38 + (i % 2 ? 7 : 0);
      arr.push({ x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, x2: Math.cos(a) * r2, y2: Math.sin(a) * r2 });
    }
    return arr;
  }
  function dots(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.5;
      const r = 24 + (i % 3) * 7;
      arr.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, s: 2 + (i % 2) });
    }
    return arr;
  }
</script>

<div class="layer" aria-hidden="true">
  {#each $bursts as b (b.id)}
    <div
      class="burst"
      style="left:{b.x}px; top:{b.y}px; --c:{COLORS[b.tone] || COLORS.pri}; --sz:{b.size}px;"
    >
      <svg viewBox="-50 -50 100 100" width={b.size} height={b.size}>
        <circle class="ring" r="10" />
        <circle class="flash" r="6" />
        {#each spikes(b.n) as s}
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        {/each}
        {#each dots(b.n) as d}
          <circle class="dot" cx={d.x} cy={d.y} r={d.s} />
        {/each}
      </svg>
    </div>
  {/each}
</div>

<style>
  .layer { position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden; }
  .burst {
    position: absolute;
    transform: translate(-50%, -50%);
    animation: boom 0.62s var(--ease-out) forwards;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
  }
  @keyframes boom {
    0%   { transform: translate(-50%, -50%) scale(0.2) rotate(-14deg); opacity: 0; }
    16%  { opacity: 1; }
    55%  { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.18) rotate(0deg); opacity: 0; }
  }
  .burst svg line { stroke: var(--c); stroke-width: 3; stroke-linecap: round; }
  .burst svg .dot { fill: var(--c); }
  .burst svg .flash { fill: #fff; }
  .burst svg .ring {
    fill: none; stroke: var(--c); stroke-width: 3;
    animation: ring 0.5s var(--ease-out) forwards;
  }
  @keyframes ring {
    0%   { r: 6;  opacity: 0.9; }
    100% { r: 30; opacity: 0; }
  }
</style>
