<script>
  import { createEventDispatcher } from 'svelte';
  import { boom } from '../lib/effects.js';
  import Icon from './Icon.svelte';

  export let value = 0;
  export let max = 5;
  const dispatch = createEventDispatcher();

  function set(i, e) {
    value = i + 1;
    dispatch('change', value);
    const r = e.currentTarget.getBoundingClientRect();
    boom(r.left + r.width / 2, r.top + r.height / 2, { tone: 'acc', size: 30, n: 6 });
  }
</script>

<div class="rate" role="slider" aria-valuenow={value} aria-valuemax={max}>
  {#each Array(max) as _, i}
    <button class="star {i < value ? 'on' : ''}" on:click={(e) => set(i, e)} aria-label={'ให้คะแนน ' + (i + 1)}>
      <Icon name="star" filled size={26} />
    </button>
  {/each}
</div>

<style>
  .rate { display: inline-flex; gap: 4px; }
  .star {
    background: none; border: none; padding: 2px; color: var(--line-2);
    transition: transform var(--dur-fast) var(--ease-spring), color var(--dur) var(--ease-out);
    line-height: 0;
  }
  .star.on { color: var(--acc); }
  .star:hover { transform: scale(1.22) rotate(-8deg); }
</style>
