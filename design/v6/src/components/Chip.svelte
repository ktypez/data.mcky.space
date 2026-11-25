<script>
  import { createEventDispatcher } from 'svelte';
  import { boom } from '../lib/effects.js';

  export let active = false;
  export let count = null;
  export let icon = null;
  const dispatch = createEventDispatcher();

  function click(e) {
    if (!active) {
      const r = e.currentTarget.getBoundingClientRect();
      boom(r.left + r.width / 2, r.top + r.height / 2, { tone: 'acc', size: 40, n: 8 });
    }
    dispatch('click');
  }
</script>

<button class="chip {active ? 'on' : ''}" on:click={click} aria-pressed={active}>
  {#if icon}<span class="ic">{icon}</span>{/if}
  <slot />
  {#if count !== null}<span class="c tnum">{count}</span>{/if}
</button>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    border-radius: var(--r-pill);
    border: 1px solid var(--line);
    background: var(--paper-2);
    color: var(--ink-2);
    font-weight: 600;
    font-size: var(--fs-xs);
    transition: transform var(--dur-fast) var(--ease-spring),
                background-color var(--dur) var(--ease-out),
                color var(--dur) var(--ease-out),
                border-color var(--dur) var(--ease-out),
                box-shadow var(--dur) var(--ease-out);
  }
  .chip:hover { transform: translateY(-1px); color: var(--ink); border-color: var(--line-2); }
  .chip:active { transform: scale(.96); }
  .chip .ic { font-size: 1em; line-height: 1; }
  .chip .c {
    font-size: var(--fs-2xs);
    background: var(--paper-3);
    color: var(--ink-3);
    padding: 2px 7px;
    border-radius: var(--r-pill);
    font-weight: 700;
  }
  .chip.on {
    background: var(--pri-soft);
    color: var(--pri);
    border-color: color-mix(in srgb, var(--pri) 40%, transparent);
    box-shadow: 0 4px 12px hsl(var(--hue-pri) 80% 50% / .18);
  }
  .chip.on .c { background: color-mix(in srgb, var(--pri) 18%, transparent); color: var(--pri); }
</style>
