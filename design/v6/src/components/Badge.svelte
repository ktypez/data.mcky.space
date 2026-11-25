<script>
  import Icon from './Icon.svelte';
  // tone: pri | acc | ok | info | warn | default
  export let tone = 'default';
  export let icon = null;     // icon name or null
  export let soft = true;
  export let size = 'md';     // sm | md
</script>

<span class="badge tone-{tone} {soft ? 'soft' : 'solid'} sz-{size}">
  {#if icon}<Icon name={icon} size={size === 'sm' ? 13 : 15} />{/if}
  <slot />
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    border-radius: var(--r-pill);
    white-space: nowrap;
    line-height: 1;
  }
  .sz-md { font-size: var(--fs-xs); padding: 6px 11px; }
  .sz-sm { font-size: var(--fs-2xs); padding: 4px 8px; }

  .soft.tone-default { background: var(--paper-3); color: var(--ink-2); }
  .soft.tone-pri { background: var(--pri-soft); color: var(--pri); }
  .soft.tone-acc { background: var(--acc-soft); color: var(--acc); }
  .soft.tone-ok  { background: hsl(150 70% 92%); color: hsl(150 60% 32%); }
  .soft.tone-info{ background: hsl(212 90% 94%); color: hsl(212 70% 42%); }
  .soft.tone-warn{ background: hsl(38 95% 92%);  color: hsl(32 80% 38%); }

  .solid.tone-pri { background: var(--pri-fill); color: var(--pri-ink); }
  .solid.tone-acc { background: var(--acc-fill); color: var(--acc-ink); }
  .solid.tone-ok  { background: hsl(150 55% 82%); color: hsl(150 45% 28%); }
  .solid.tone-info{ background: hsl(212 70% 85%); color: hsl(212 55% 30%); }
  .solid.tone-warn{ background: hsl(40 85% 82%); color: hsl(28 60% 30%); }
  .solid.tone-default { background: var(--ink); color: var(--paper); }

  :global([data-theme="dark"]) .soft.tone-ok  { background: hsl(150 50% 22%); color: hsl(150 60% 74%); }
  :global([data-theme="dark"]) .soft.tone-info{ background: hsl(212 60% 24%); color: hsl(212 80% 78%); }
  :global([data-theme="dark"]) .soft.tone-warn{ background: hsl(36 60% 24%); color: hsl(36 90% 74%); }
</style>
