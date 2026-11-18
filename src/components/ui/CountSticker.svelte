<script lang="ts">
  import SharedCountSticker from '@mcky/ui/count-sticker'
  let { n, label, rot = -2, class: className = '' }: { n: number | string; label: string; rot?: number; class?: string } = $props()
</script>

<SharedCountSticker value={n} {label} rotation={rot} class={className} />
