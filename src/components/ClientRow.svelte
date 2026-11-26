<script>
  import { createEventDispatcher } from 'svelte';
  import { boom, toast } from '../lib/effects.js';
  import { fmtDate, clientClip, copyText } from '../lib/format.js';
  import Monogram from './Monogram.svelte';
  import Badge from './Badge.svelte';
  import Icon from './Icon.svelte';

  export let client;
  const dispatch = createEventDispatcher();
  let imgOk = true;

  $: photo = client.photos && client.photos[0];

  async function copyCustomer(e) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const ok = await copyText(clientClip(client));
    boom(r.left + r.width / 2, r.top + r.height / 2, { tone: ok ? 'ok' : 'warn', size: 34 });
    toast(ok ? 'คัดลอกข้อมูลลูกค้าแล้ว' : 'คัดลอกไม่สำเร็จ', { tone: ok ? 'ok' : 'warn', icon: ok ? 'check' : 'info' });
  }
</script>

<div
  class="row"
  role="button"
  tabindex="0"
  on:click={() => dispatch('open', client)}
  on:keydown={(e) => e.key === 'Enter' && dispatch('open', client)}
>
  <span class="ava">
    {#if photo && imgOk}
      <img src={photo} alt="" loading="lazy" on:error={() => (imgOk = false)} />
    {:else}
      <Monogram name={client.name} size={40} />
    {/if}
  </span>

  <span class="who">
    <span class="name">{client.name}</span>
    <span class="sub">{client.customer}</span>
  </span>

  <span class="flags">
    {#if client.payment === 'day'}
      <Badge tone="pri" icon="bolt" size="sm">จ่ายในวัน</Badge>
    {:else if client.payment === 'card'}
      <Badge tone="info" icon="check" size="sm">บัตรเครดิต</Badge>
    {/if}
    {#if client.note}
      <Badge tone="acc" icon="info" size="sm">มีโน้ต</Badge>
    {/if}
    {#if !photo}
      <Badge tone="warn" icon="info" size="sm">ไม่มีรูป</Badge>
    {/if}
  </span>

  <time datetime={client.updatedAt}>{fmtDate(client.updatedAt)}</time>

  <button class="copy" aria-label="คัดลอกข้อมูลลูกค้า" title="คัดลอกข้อมูลลูกค้า" on:click={copyCustomer}>
    <Icon name="copy" size={15} />
  </button>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 40px minmax(0, 1.5fr) minmax(0, 1fr) 96px 34px;
    align-items: center;
    gap: 14px;
    padding: 9px 16px;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
    cursor: pointer;
    transition: background-color var(--dur-fast) var(--ease-out);
  }
  .row:last-of-type { border-bottom: none; }
  .row:hover { background: color-mix(in srgb, var(--pri) 5%, var(--paper-2)); }
  .row:focus-visible { box-shadow: inset var(--ring); border-radius: 0; }

  .ava { width: 40px; height: 40px; overflow: hidden; border-radius: 50%; flex: none; background: var(--paper-3); }
  .ava img { width: 100%; height: 100%; object-fit: cover; }

  .who { display: flex; flex-direction: column; min-width: 0; }
  .name {
    font-weight: 600; font-size: var(--fs-md); color: var(--ink);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sub {
    font-size: var(--fs-xs); color: var(--ink-3);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .flags { display: flex; gap: 6px; flex-wrap: wrap; min-width: 0; overflow: hidden; }

  time {
    font-size: var(--fs-sm); color: var(--ink-3); text-align: right;
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }

  .copy {
    width: 30px; height: 30px; display: grid; place-items: center;
    border: none; background: transparent; color: var(--ink-3);
    border-radius: var(--r-xs);
    opacity: .5;
    transition: opacity var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
  }
  .row:hover .copy, .row:focus-within .copy { opacity: 1; }
  .copy:hover { background: var(--pri-soft); color: var(--pri); }

  @media (max-width: 760px) {
    .row { grid-template-columns: 40px minmax(0, 1fr) 84px 34px; gap: 10px; padding: 9px 12px; }
    .flags { display: none; }
  }
</style>
