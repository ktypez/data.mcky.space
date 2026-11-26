<script lang="ts">
  import { onMount } from 'svelte'
  import MapPreview from './MapPreview.svelte'

  let { lat, lng }: { lat: number; lng: number } = $props()
  let near = $state(false)
  let ref: HTMLDivElement

  onMount(() => {
    if (typeof IntersectionObserver === 'undefined') {
      near = true
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near = true
          io.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    io.observe(ref)
    return () => io.disconnect()
  })
</script>

<div bind:this={ref} class="h-full w-full">
  {#if near}
    <MapPreview {lat} {lng} />
  {:else}
    <div class="flex h-full w-full items-center justify-center rounded-2xl border-[1.5px] border-dashed border-rule-2 bg-paper-2/50 text-xs font-semibold text-ink-faint" style="min-height: 160px">กำลังโหลดแผนที่…</div>
  {/if}
</div>
