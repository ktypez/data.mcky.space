<script>
  import { createEventDispatcher } from 'svelte';
  export let value = 0;
  export let min = 0;
  export let max = 100;
  export let step = 1;
  export let label = '';
  export let display = '';
  export let hint = '';
  const dispatch = createEventDispatcher();
  function onInput(e) {
    value = +e.target.value;
    dispatch('input', value);
  }
</script>

<div class="sl">
  <div class="sl-head">
    <span class="sl-label">{label}</span>
    <span class="sl-val tnum">{display}</span>
  </div>
  <input type="range" {min} {max} {step} {value} on:input={onInput} />
  {#if hint}<span class="sl-hint dim">{hint}</span>{/if}
</div>

<style>
  .sl { display: flex; flex-direction: column; gap: 7px; }
  .sl-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .sl-label { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); }
  .sl-val {
    font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 700;
    color: var(--pri); background: var(--pri-soft);
    padding: 2px 10px; border-radius: var(--r-pill);
  }
  .sl-hint { font-size: var(--fs-2xs); }

  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: var(--r-pill);
    background: var(--paper-3);
    border: 1px solid var(--line);
    outline: none;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: var(--pri-fill);
    border: 2.5px solid var(--paper-2);
    box-shadow: 0 1px 4px rgb(var(--shadow-rgb) / .25), 0 0 0 1px var(--line-2);
    transition: transform var(--dur-fast) var(--ease-spring);
  }
  input[type='range']::-webkit-slider-thumb:hover { transform: scale(1.15); }
  input[type='range']:active::-webkit-slider-thumb { transform: scale(1.25); }
  input[type='range']::-moz-range-thumb {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: var(--pri-fill);
    border: 2.5px solid var(--paper-2);
    box-shadow: 0 1px 4px rgb(var(--shadow-rgb) / .25), 0 0 0 1px var(--line-2);
  }
  input[type='range']::-moz-range-track {
    height: 6px; border-radius: var(--r-pill);
    background: var(--paper-3); border: 1px solid var(--line);
  }
</style>
