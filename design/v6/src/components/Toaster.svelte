<script>
  import { toasts, dismissToast } from '../lib/effects.js';
  import Icon from './Icon.svelte';

  const ICONS = { default: 'sparkles', pri: 'sparkles', ok: 'check', acc: 'heart', warn: 'bolt', info: 'info' };
</script>

<div class="toasts">
  {#each $toasts as t (t.id)}
    <button class="toast tone-{t.tone}" on:click={() => dismissToast(t.id)}>
      <span class="ic"><Icon name={t.icon || ICONS[t.tone] || 'sparkles'} size={16} /></span>
      <span class="msg">{t.message}</span>
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: 10px;
    z-index: 9000;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px 12px 14px;
    border-radius: var(--r-pill);
    background: var(--paper-2);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-pop-lg);
    color: var(--ink);
    font-weight: 600;
    font-size: var(--fs-sm);
    animation: toastIn 0.42s var(--ease-spring);
    max-width: min(92vw, 420px);
  }
  .toast .ic {
    display: inline-grid; place-items: center;
    width: 28px; height: 28px; border-radius: var(--r-pill);
    background: var(--pri-soft); color: var(--pri);
    flex: none;
  }
  .toast.tone-ok  .ic { background: hsl(150 70% 92%); color: hsl(150 60% 32%); }
  .toast.tone-acc .ic { background: var(--acc-soft); color: var(--acc); }
  .toast.tone-warn .ic { background: hsl(38 95% 92%); color: hsl(32 80% 38%); }
  .toast.tone-info .ic { background: hsl(212 90% 94%); color: hsl(212 70% 42%); }
  @keyframes toastIn {
    0%   { transform: translateY(18px) scale(0.9); opacity: 0; }
    60%  { transform: translateY(-3px) scale(1.02); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
</style>
