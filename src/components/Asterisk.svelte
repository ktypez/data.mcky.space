<script>
  export let size = 28;
  export let color = 'var(--pri)';
  export let spin = false;
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" class={spin ? 'spin' : ''} aria-hidden="true">
  <g stroke={color} stroke-width="2.4" stroke-linecap="round">
    <path d="M12 3v18" />
    <path d="M4.2 7.5 19.8 16.5" />
    <path d="M4.2 16.5 19.8 7.5" />
  </g>
</svg>

<style>
  svg { display: block; overflow: visible; }
  .spin { animation: spin 14s linear infinite; transform-origin: center; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
