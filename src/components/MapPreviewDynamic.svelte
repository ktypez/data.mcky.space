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
    <div class="w-full h-full rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground text-xs" style="min-height: 160px">กำลังโหลดแผนที่…</div>
  {/if}
</div>
