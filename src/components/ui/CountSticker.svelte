<script lang="ts">
  let { n, label, rot = -2 }: { n: number | string; label: string; rot?: number } = $props()
</script>

<span class="count-sticker" style="transform: rotate({rot}deg);">
  <span class="count-sticker-n">{n}</span>
  <span class="count-sticker-l">{label}</span>
</span>
