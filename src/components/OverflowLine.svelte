<script lang="ts">
  import { onMount } from 'svelte'

  let {
    values,
    separator = ' / ',
    className = '',
  }: { values: string[]; separator?: string; className?: string } = $props()

  let container: HTMLDivElement
  let measure: HTMLSpanElement
  let visible = $state(values.length)

  function compute() {
    if (!container || !measure || values.length === 0) return
    const maxWidth = container.clientWidth
    const count = values.length
    let lo = 1
    let hi = count
    let best = count
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const tail = mid < count ? ` +${count - mid}` : ''
      measure.textContent = values.slice(0, mid).join(separator) + tail
      if (measure.offsetWidth <= maxWidth) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    visible = best
  }

  $effect(() => {
    values
    separator
    compute()
  })

  onMount(() => {
    if (!container) return
    const ro = new ResizeObserver(compute)
    ro.observe(container)
    return () => ro.disconnect()
  })

  let overflow = $derived(values.length - visible)
</script>

{#if values.length > 0}
  <div bind:this={container} class="relative overflow-hidden whitespace-nowrap {className}">
    {values.slice(0, visible).join(separator)}
    {#if overflow > 0}
      <span class="text-current opacity-60"> +{overflow}</span>
    {/if}
    <span bind:this={measure} aria-hidden="true" class="invisible absolute left-[-9999px] top-0 whitespace-nowrap"></span>
  </div>
{/if}
