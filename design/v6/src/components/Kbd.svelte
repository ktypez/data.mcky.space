<script>
  export let keys = [];
</script>

<span class="kbd-wrap">
  {#each keys as k}<kbd>{k}</kbd>{/each}
</span>

<style>
  .kbd-wrap { display: inline-flex; gap: 3px; align-items: center; }
  kbd {
    font-family: var(--font-sans);
    font-size: var(--fs-2xs);
    font-weight: 600;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 7px;
    background: var(--paper-2);
    border: 1px solid var(--line-2);
    box-shadow: 0 1px 0 var(--line-2);
    color: var(--ink-2);
    min-width: 18px;
    text-align: center;
  }
</style>
