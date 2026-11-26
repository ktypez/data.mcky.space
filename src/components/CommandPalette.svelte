<script>
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';
  import Kbd from './Kbd.svelte';
  import { burstAt } from '../lib/effects.js';

  export let open = false;
  export let commands = [];   // [{ id, label, icon, group, hint, keywords, run }]

  const dispatch = createEventDispatcher();
  let q = '';
  let active = 0;

  function buildGroups() {
    const t = q.trim().toLowerCase();
    const list = commands.filter(c =>
      !t ||
      c.label.toLowerCase().includes(t) ||
      (c.group || '').toLowerCase().includes(t) ||
      (c.keywords || '').toLowerCase().includes(t)
    );
    const map = new Map();
    for (const c of list) {
      const g = c.group || 'เมนู';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(c);
    }
    return [...map.entries()];
  }

  $: groups = buildGroups();
  $: flat = groups.flatMap(([, v]) => v);
  $: if (active >= flat.length) active = Math.max(0, flat.length - 1);

  function onInput(e) {
    q = e.target.value;
    active = 0;
  }
  function close() { dispatch('close'); }
  function choose(c, e) {
    if (!c) return;
    if (e) burstAt(e, { tone: 'pri', size: 40, n: 8 });
    dispatch('close');
    if (c.run) c.run();
    q = '';
    active = 0;
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) active = (active + 1) % flat.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) active = (active - 1 + flat.length) % flat.length; }
    else if (e.key === 'Enter') { e.preventDefault(); choose(flat[active]); }
  }

  function autofocus(node) { node.focus(); }
  function scrollActive(node, isActive) { if (isActive) node.scrollIntoView({ block: 'nearest' }); }
  // delegate keyboard handling to the palette container (works from input or list items)
  function keyer(node) {
    const h = (e) => onKey(e);
    node.addEventListener('keydown', h);
    return { destroy: () => node.removeEventListener('keydown', h) };
  }
</script>

{#if open}
  <div class="scrim" on:click={(e) => e.target === e.currentTarget && close()} role="presentation">
    <div class="palette" role="dialog" aria-modal="true" use:keyer>
      <div class="head">
        <Icon name="search" size={18} />
        <input
          use:autofocus
          value={q}
          on:input={onInput}
          placeholder="ค้นหาคำสั่ง, หน้า, หรือลูกค้า…"
          type="text"
          autocomplete="off"
          spellcheck="false"
        />
        <Kbd keys={['esc']} />
      </div>

      <div class="list">
        {#if flat.length === 0}
          <div class="empty">ไม่พบผลลัพธ์สำหรับ “{q}”</div>
        {:else}
          {#each groups as [group, items]}
            <div class="group-label">{group}</div>
            {#each items as c, i}
              {@const idx = flat.indexOf(c)}
              <button
                class="item {idx === active ? 'on' : ''}"
                use:scrollActive={idx === active}
                on:mousemove={() => (active = idx)}
                on:click={(e) => choose(c, e)}
              >
                <span class="ic"><Icon name={c.icon || 'sparkles'} size={17} /></span>
                <span class="label">{c.label}</span>
                {#if c.hint}<Kbd keys={c.hint} />{/if}
              </button>
            {/each}
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 9500;
    background: var(--scrim);
    backdrop-filter: blur(3px);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 14vh;
    animation: fade 0.18s var(--ease-out);
  }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  .palette {
    width: min(92vw, 560px);
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--r-xl);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: pop 0.26s var(--ease-spring);
  }
  @keyframes pop { from { transform: translateY(-10px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }
  .head {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--line);
    color: var(--ink-3);
  }
  .head input {
    flex: 1; min-width: 0; border: none; background: transparent; outline: none;
    font-size: var(--fs-lg); color: var(--ink);
  }
  .head input::placeholder { color: var(--ink-3); }
  .list { max-height: 54vh; overflow-y: auto; padding: 10px; }
  .group-label {
    font-size: var(--fs-2xs); font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--ink-3);
    padding: 10px 12px 6px;
  }
  .item {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 11px 12px; border: none; background: transparent;
    border-radius: var(--r-md); color: var(--ink); text-align: left;
    font-size: var(--fs-md); font-weight: 500;
    transition: background-color var(--dur-fast) var(--ease-out);
  }
  .item .ic {
    display: inline-grid; place-items: center;
    width: 32px; height: 32px; border-radius: var(--r-sm);
    background: var(--paper-3); color: var(--ink-2); flex: none;
  }
  .item .label { flex: 1; }
  .item.on { background: var(--pri-soft); color: var(--pri); }
  .item.on .ic { background: var(--pri); color: var(--pri-ink); }
  .item:active { transform: scale(.98); }
  .empty { padding: 30px 16px; text-align: center; color: var(--ink-3); }
</style>
