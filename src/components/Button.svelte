<script>
  import { createEventDispatcher } from 'svelte';
  import { boom } from '../lib/effects.js';
  import Icon from './Icon.svelte';

  export let variant = 'solid';   // solid | soft | outline | ghost
  export let size = 'md';         // sm | md | lg
  export let tone = 'pri';        // pri | acc | default
  export let type = 'button';
  export let disabled = false;
  export let full = false;
  export let icon = null;         // leading icon name
  export let iconRight = null;
  export let burst = true;        // impact burst on confirm
  export let burstTone = tone === 'default' ? 'pri' : tone;

  const dispatch = createEventDispatcher();
  let pressing = false;
  let popOn = false;
  let timer;

  function onPress() { if (!disabled) pressing = true; }
  function onRelease() { pressing = false; }

  function onClick(e) {
    if (disabled) return;
    popOn = true;
    clearTimeout(timer);
    timer = setTimeout(() => (popOn = false), 260);
    if (burst) {
      const r = e.currentTarget.getBoundingClientRect();
      boom(r.left + r.width / 2, r.top + r.height / 2, {
        tone: burstTone,
        size: Math.max(r.width, r.height) * 0.95
      });
    }
    dispatch('click', e);
  }
</script>

<button
  class="btn v-{variant} t-{tone} s-{size} {full ? 'full' : ''} {pressing ? 'press' : ''} {popOn ? 'pop' : ''}"
  {type} {disabled}
  on:pointerdown={onPress}
  on:pointerup={onRelease}
  on:pointerleave={onRelease}
  on:click={onClick}
>
  {#if icon}<Icon name={icon} size={size === 'lg' ? 20 : size === 'sm' ? 15 : 18} />{/if}
  <slot />
  {#if iconRight}<Icon name={iconRight} size={size === 'lg' ? 20 : size === 'sm' ? 15 : 18} />{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    border: 1px solid transparent;
    border-radius: var(--r-pill);
    font-weight: 600;
    font-family: var(--font-sans);
    white-space: nowrap;
    user-select: none;
    transition: transform var(--dur-fast) var(--ease-spring),
                box-shadow var(--dur) var(--ease-out),
                background-color var(--dur) var(--ease-out),
                border-color var(--dur) var(--ease-out),
                color var(--dur) var(--ease-out);
    will-change: transform;
  }
  .btn:active { transform: translateY(1px); }
  .btn.press { transform: scale(.95); }
  .btn.pop { animation: btnPop var(--dur-slow) var(--ease-spring); }
  @keyframes btnPop {
    0%   { transform: scale(.95); }
    45%  { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  .btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

  .s-sm { font-size: var(--fs-sm); padding: 6px 12px; }
  .s-md { font-size: var(--fs-sm); padding: 8px 15px; }
  .s-lg { font-size: var(--fs-md); padding: 11px 20px; }
  .full { width: 100%; }

  /* tones + variants */
  .v-solid.t-pri  { background: var(--pri-fill); color: var(--pri-ink); box-shadow: 0 6px 16px hsl(var(--hue-pri) 60% 78% / .45); }
  .v-solid.t-acc  { background: var(--acc-fill); color: var(--acc-ink); box-shadow: 0 6px 16px hsl(var(--hue-acc) 70% 82% / .45); }
  .v-solid.t-default { background: var(--ink); color: var(--paper); }

  .v-soft.t-pri  { background: var(--pri-soft); color: var(--pri); }
  .v-soft.t-acc  { background: var(--acc-soft); color: var(--acc); }
  .v-soft.t-default { background: var(--paper-3); color: var(--ink-2); }

  .v-outline.t-pri  { background: transparent; color: var(--pri); border-color: color-mix(in srgb, var(--pri) 45%, transparent); }
  .v-outline.t-acc  { background: transparent; color: var(--acc); border-color: color-mix(in srgb, var(--acc) 45%, transparent); }
  .v-outline.t-default { background: transparent; color: var(--ink-2); border-color: var(--line-2); }

  .v-ghost { background: transparent; color: var(--ink-2); }
  .v-ghost:hover { background: var(--paper-3); color: var(--ink); }

  .v-solid.t-pri:hover  { background: var(--pri-fill-hov); }
  .v-solid.t-acc:hover  { background: var(--acc-fill-hov); }
  .v-soft.t-pri:hover   { background: color-mix(in srgb, var(--pri-soft) 70%, var(--pri) 8%); }
  .v-outline.t-pri:hover{ background: var(--pri-soft); }
</style>
