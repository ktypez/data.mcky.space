<script lang="ts">
  // Deterministic monogram: same name → same tint/ink pair, every render.
  const TINTS = ['var(--acc-tint)', 'var(--pop-tint)', 'var(--credit-tint)', 'var(--penpay-tint)']
  const INKS = ['var(--acc-ink)', 'var(--pop-ink)', 'var(--credit-ink)', 'var(--penpay-ink)']

  let { name, size = 40, class: className = '' }: { name: string; size?: number; class?: string } = $props()

  let index = $derived(Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % TINTS.length)
  let letters = $derived(Array.from(name.replace(/\s/g, '')).slice(0, 2).join(''))
</script>

<span
  class="grid shrink-0 place-items-center rounded-full border font-bold {className}"
  style="width: {size}px; height: {size}px; background: {TINTS[index]}; color: {INKS[index]}; border-color: color-mix(in srgb, currentColor 35%, transparent); font-size: {Math.round(size * 0.36)}px;"
  aria-hidden="true"
>
  {letters}
</span>
