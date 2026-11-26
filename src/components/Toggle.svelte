<script>
  import { createEventDispatcher } from 'svelte';
  import { burstAt } from '../lib/effects.js';
  export let checked = false;
  export let label = '';
  const dispatch = createEventDispatcher();
  function toggle(e) {
    burstAt(e, { tone: 'acc', size: 30, n: 6 });
    checked = !checked;
    dispatch('change', checked);
  }
</script>

<button class="toggle {checked ? 'on' : ''}" role="switch" aria-checked={checked} on:click={toggle}>
  <span class="track"><span class="knob"></span></span>
  {#if label}<span class="lbl">{label}</span>{/if}
</button>

<style>
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: none;
    border: none;
    color: var(--ink-2);
    font-weight: 600;
    font-size: var(--fs-sm);
  }
  .track {
    position: relative;
    width: 46px; height: 28px;
    border-radius: var(--r-pill);
    background: var(--paper-3);
    border: 1px solid var(--line-2);
    transition: background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out);
    flex: none;
  }
  .knob {
    position: absolute;
    top: 2px; left: 2px;
    width: 22px; height: 22px;
    border-radius: var(--r-pill);
    background: #fff;
    box-shadow: var(--shadow-sm);
    transition: transform var(--dur) var(--ease-spring), background-color var(--dur) var(--ease-out);
  }
  .toggle.on .track { background: var(--pri-fill); border-color: var(--pri-fill); }
  .toggle.on .knob { transform: translateX(18px); background: var(--pri-ink); }
  .toggle:active .knob { width: 26px; }
  .toggle.on:active .knob { transform: translateX(14px); }
</style>
