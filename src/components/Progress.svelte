<script>
  import { onMount } from 'svelte';
  export let value = 0;
  export let max = 100;
  let shown = 0;
  onMount(() => {
    const id = requestAnimationFrame(() => (shown = value));
    return () => cancelAnimationFrame(id);
  });
  $: pct = Math.max(0, Math.min(100, Math.round((shown / max) * 100)));
</script>

<div class="prog" role="progressbar" aria-valuenow={pct} aria-valuemax={100}>
  <div class="bar" style="width:{pct}%"></div>
</div>

<style>
  .prog {
    height: 12px; border-radius: var(--r-pill);
    background: var(--paper-3); overflow: hidden; border: 1px solid var(--line);
  }
  .bar {
    height: 100%; border-radius: var(--r-pill); background: var(--pri-fill);
    transition: width 1s var(--ease-out);
  }
</style>
