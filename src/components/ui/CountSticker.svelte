<script lang="ts">
  let { n, label, rot = -2, class: className = '' }: { n: number | string; label: string; rot?: number; class?: string } = $props()
</script>

<span class="count-sticker {className}" style:--rot="{rot}deg">
  <strong class="count-sticker-n">{n}</strong><span class="count-sticker-l">{label}</span>
</span>

<style>
  .count-sticker { display: inline-flex; align-items: baseline; gap: 6px; padding: 6px 12px; border: 1px solid color-mix(in srgb,var(--pri) 24%,var(--rule)); border-radius: var(--mochi-radius-sm); background: var(--card); box-shadow: var(--mochi-shadow-sticker); transform: rotate(var(--rot)); }
  .count-sticker-n { color: var(--pri-ink); font: 700 18px/1 var(--font-mono); }
  .count-sticker-l { color: var(--ink-soft); font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
</style>
