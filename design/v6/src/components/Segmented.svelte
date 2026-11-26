<script>
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';

  export let options = [];      // [{ id, label, icon? }]
  export let value = options[0]?.id;
  const dispatch = createEventDispatcher();

  $: index = Math.max(0, options.findIndex(o => o.id === value));
  $: n = options.length || 1;
  // glider geometry: container has 4px padding each side and 4px gaps between n items
  $: gw = `calc((100% - 8px - ${(n - 1) * 4}px) / ${n})`;

  function pick(o) {
    if (o.disabled) return;
    value = o.id;
    dispatch('change', o.id);
  }
</script>

<div class="seg" role="tablist">
  <span class="glider" style="--gw:{gw}; width:var(--gw); transform:translateX(calc({index} * (var(--gw) + 4px)));"></span>
  {#each options as o}
    <button
      class="opt {o.id === value ? 'on' : ''}"
      role="tab"
      aria-selected={o.id === value}
      on:click={() => pick(o)}
    >
      {#if o.icon}<Icon name={o.icon} size={16} />{/if}
      {o.label}
    </button>
  {/each}
</div>

<style>
  .seg {
    position: relative;
    display: flex;
    background: var(--paper-3);
    border: 1px solid var(--line);
    border-radius: var(--r-pill);
    padding: 4px;
    gap: 4px;
  }
  .glider {
    position: absolute;
    top: 4px;
    left: 4px;
    bottom: 4px;
    border-radius: var(--r-pill);
    background: var(--paper-2);
    box-shadow: var(--shadow-sm);
    transition: transform var(--dur) var(--ease-spring);
    z-index: 0;
  }
  .opt {
    position: relative;
    z-index: 1;
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: var(--ink-2);
    font-weight: 600;
    font-size: var(--fs-sm);
    padding: 6px 12px;
    border-radius: var(--r-pill);
    transition: color var(--dur) var(--ease-out);
    white-space: nowrap;
  }
  .opt.on { color: var(--pri); }
  .opt:hover:not(.on) { color: var(--ink); }
</style>
