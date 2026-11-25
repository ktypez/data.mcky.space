<script>
  import { createEventDispatcher } from 'svelte';
  import { boom } from '../lib/effects.js';
  import { toast } from '../lib/effects.js';
  import { fmtDateFull, copyText, clientClip } from '../lib/format.js';
  import { PAYMENT } from '../lib/data.js';
  import Monogram from './Monogram.svelte';
  import Icon from './Icon.svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Asterisk from './Asterisk.svelte';

  export let client;
  const dispatch = createEventDispatcher();

  let imgOk = true;
  $: photo = client.photos[0];
  $: pay = client.payment ? PAYMENT[client.payment] : null;

  async function copy(e) {
    const r = e.currentTarget.getBoundingClientRect();
    boom(r.left + r.width / 2, r.top + r.height / 2, { tone: 'acc', size: 50, n: 10 });
    const ok = await copyText(clientClip(client));
    toast(ok ? 'คัดลอกรายการแล้ว' : 'คัดลอกไม่สำเร็จ', { tone: ok ? 'ok' : 'warn', icon: ok ? 'check' : 'info' });
  }
</script>

  <div class="scrim" on:click={(e) => e.target === e.currentTarget && dispatch('close')} role="presentation">
  <section class="sheet" role="dialog" aria-modal="true">
    <button class="close" on:click={() => dispatch('close')} aria-label="ปิด"><Icon name="close" size={18} /></button>
    <span class="deco"><Asterisk size={26} color="var(--acc)" /></span>

    <div class="media">
      {#if photo && imgOk}
        <img src={photo} alt={client.name} on:error={() => (imgOk = false)} />
      {:else}
        <div class="mono-fill"><Monogram name={client.name} size={96} /></div>
      {/if}
    </div>

    <div class="content">
      <div class="tags">
        {#if pay}<Badge tone={pay.tone} icon="bolt">{pay.label}</Badge>{/if}
        {#if client.photos.length}<Badge tone="default" icon="photo">มีรูป {client.photos.length}</Badge>{/if}
        {#if client.note}<Badge tone="acc" icon="note">มีโน้ต</Badge>{/if}
      </div>

      <h2 class="title">{client.name}</h2>

      <dl class="meta">
        <div><dt>ลูกค้า</dt><dd>{client.customer || '—'}</dd></div>
        {#if client.branch}<div><dt>สาขา</dt><dd>{client.branch}</dd></div>{/if}
        <div><dt>อัปเดตล่าสุด</dt><dd>{fmtDateFull(client.updatedAt)}</dd></div>
        <div><dt>รหัส</dt><dd class="mono-id">{client.id.toUpperCase()}</dd></div>
      </dl>

      {#if client.note}
        <div class="note">
          <Icon name="note" size={16} />
          <p>{client.note}</p>
        </div>
      {/if}

      <div class="actions">
        <Button icon="copy" on:click={copy}>คัดลอกรายการ</Button>
        <Button variant="ghost" iconRight="arrow-right" on:click={() => dispatch('close')}>ปิด</Button>
      </div>
    </div>
  </section>
</div>

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 8000;
    background: var(--scrim);
    backdrop-filter: blur(4px);
    display: flex; justify-content: flex-end;
    animation: fade 0.2s var(--ease-out);
  }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  .sheet {
    position: relative;
    width: min(94vw, 460px);
    height: 100%;
    background: var(--paper);
    border-left: 1px solid var(--line);
    box-shadow: var(--shadow-lg);
    overflow-y: auto;
    animation: slide 0.34s var(--ease-spring);
    padding-bottom: 30px;
  }
  @keyframes slide { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  .deco { position: absolute; top: 18px; right: 58px; opacity: .5; }

  .close {
    position: absolute; top: 16px; right: 16px; z-index: 2;
    width: 36px; height: 36px; display: grid; place-items: center;
    border: none; border-radius: var(--r-pill);
    background: var(--paper-2); color: var(--ink-2);
    box-shadow: var(--shadow-sm);
    transition: background var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
  }
  .close:hover { background: var(--pri); color: var(--pri-ink); transform: rotate(90deg); }

  .media {
    width: 100%; aspect-ratio: 16 / 11; background: var(--paper-3); overflow: hidden;
  }
  .media img { width: 100%; height: 100%; object-fit: cover; }
  .mono-fill {
    width: 100%; height: 100%; display: grid; place-items: center;
    background:
      radial-gradient(120% 120% at 80% 0%, var(--pri-soft), transparent 60%),
      radial-gradient(120% 120% at 0% 100%, var(--acc-soft), transparent 55%),
      var(--paper-3);
  }

  .content { padding: 22px 24px; }
  .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .title {
    font-family: var(--font-display);
    font-size: var(--fs-2xl); font-weight: 700; line-height: 1.2;
    color: var(--ink); margin-bottom: 16px;
  }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; margin: 0 0 18px; }
  .meta dt { font-size: var(--fs-2xs); text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); font-weight: 700; margin-bottom: 3px; }
  .meta dd { margin: 0; font-size: var(--fs-md); font-weight: 600; color: var(--ink); }
  .mono-id { font-family: var(--font-fun); letter-spacing: .04em; }

  .note {
    display: flex; gap: 10px; align-items: flex-start;
    background: var(--acc-soft); color: color-mix(in srgb, var(--acc) 70%, var(--ink));
    padding: 13px 15px; border-radius: var(--r-md); margin-bottom: 20px;
    border: 1px solid color-mix(in srgb, var(--acc) 25%, transparent);
  }
  .note p { margin: 0; font-size: var(--fs-sm); line-height: 1.55; }

  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
