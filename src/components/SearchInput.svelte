<script>
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';
  import Kbd from './Kbd.svelte';
  import { burstAt } from '../lib/effects.js';

  export let value = '';
  export let placeholder = 'ค้นหา…';
  export let hint = null;       // array of kbd keys, e.g. ['⌘','K']
  const dispatch = createEventDispatcher();

  function onInput(e) {
    value = e.target.value;
    dispatch('input', value);
  }
  function clear() {
    value = '';
    dispatch('input', '');
    dispatch('clear');
  }
</script>

<div class="search">
  <Icon name="search" size={18} />
  <input
    {value}
    on:input={onInput}
    {placeholder}
    type="search"
    autocomplete="off"
    spellcheck="false"
  />
  {#if value}
    <button class="clr" on:click={(e) => { burstAt(e, { tone: 'acc', size: 24, n: 6 }); clear(); }} aria-label="ล้าง"><Icon name="x" size={14} /></button>
  {/if}
  {#if hint}<Kbd keys={hint} />{/if}
</div>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    height: 40px;
    background: var(--paper-2);
    border: 1.5px solid var(--line);
    border-radius: var(--r-pill);
    color: var(--ink-3);
    transition: border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    flex: 1;
    min-width: 0;
  }
  .search:focus-within {
    border-color: var(--pri);
    box-shadow: 0 0 0 4px var(--pri-soft);
    color: var(--pri);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    font-size: var(--fs-sm);
    color: var(--ink);
  }
  /* Only the outer pill gets the focus ring — no second frame on the input. */
  .search input:focus, .search input:focus-visible {
    outline: none;
    box-shadow: none;
    border: none;
    border-radius: 0;
  }
  .search input::placeholder { color: var(--ink-3); }
  .search input::-webkit-search-cancel-button { display: none; }
  .clr {
    display: inline-grid;
    place-items: center;
    width: 26px; height: 26px;
    border-radius: var(--r-pill);
    border: none; background: var(--paper-3); color: var(--ink-2);
    transition: background var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
  }
  .clr:hover { background: var(--line); transform: scale(1.08); }
</style>
