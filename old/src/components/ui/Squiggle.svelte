<script lang="ts">
  
  let { class: className = '', style }: { class?: string; style?: string } = $props()
</script>

<svg viewBox="0 0 74 6" class="squiggle {className}" {style} aria-hidden="true" preserveAspectRatio="none">
  <path d="M1 4c6-3.5 8-3.5 14 0s8 3.5 14 0 8-3.5 14 0 8 3.5 14 0 8-3.5 14 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
</svg>
