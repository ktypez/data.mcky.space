<script>
  import { createEventDispatcher } from 'svelte';
  import { boom, toast, burstAt } from '../lib/effects.js';
  import { fmtDateFull, fmtDateTime, copyText, clientClip } from '../lib/format.js';
  import { PAYMENT } from '../lib/data.js';
  import { auth } from '../lib/auth.js';
  import { openEditor } from '../lib/ui.js';
  import Monogram from './Monogram.svelte';
  import Icon from './Icon.svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Asterisk from './Asterisk.svelte';

  export let client;
  const dispatch = createEventDispatcher();

  let imgOk = true;
  let lightbox = null;
  let photoIndex = 0;
  let lastId = null;
  let startX = null;
  let startY = null;
  let copiedAll = false;
  let copiedLink = false;

  $: photos = Array.isArray(client.photos) ? client.photos : [];
  $: if (client && client.id !== lastId) { lastId = client.id; photoIndex = 0; imgOk = true; }
  $: photo = photos[photoIndex];
  $: pay = client.payment ? PAYMENT[client.payment] : null;
  $: hasCoords = typeof client.lat === 'number' && typeof client.lng === 'number';
  $: mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${client.lat},${client.lng}`
    : '';

  function burst(e, tone = 'acc') {
    const el = e?.currentTarget || e?.target;
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    boom(r.left + r.width / 2, r.top + r.height / 2, { tone, size: 40, n: 8 });
  }

  function step(delta, e) {
    if (!photos.length) return;
    if (e) burstAt(e, { tone: 'acc', size: 34, n: 8 });
    photoIndex = (photoIndex + delta + photos.length) % photos.length;
    imgOk = true;
  }
  function onDown(e) { startX = e.clientX; startY = e.clientY; }
  function onUp(e) {
    if (startX === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = null;
    startY = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { step(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && photo) lightbox = photoIndex;
  }

  async function copyAll(e) {
    burst(e, 'acc');
    const ok = await copyText(clientClip(client));
    if (ok) {
      copiedAll = true;
      setTimeout(() => (copiedAll = false), 1800);
    }
    toast(ok ? 'คัดลอกข้อมูลแล้ว' : 'คัดลอกไม่สำเร็จ', { tone: ok ? 'ok' : 'warn', icon: ok ? 'check' : 'info' });
  }

  async function copyLink(e) {
    burst(e, 'pri');
    const url = `${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(client.id)}`;
    const ok = await copyText(url);
    if (ok) {
      copiedLink = true;
      setTimeout(() => (copiedLink = false), 1800);
    }
    toast(ok ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกไม่สำเร็จ', { tone: ok ? 'ok' : 'warn', icon: ok ? 'check' : 'info' });
  }
</script>

<div class="scrim" on:click={(e) => e.target === e.currentTarget && dispatch('close')} role="presentation">
  <section class="sheet" role="dialog" aria-modal="true" aria-label="รายละเอียดลูกค้า">
    <button class="close" on:click={(e) => { burstAt(e, { tone: 'pri', size: 34 }); dispatch('close'); }} aria-label="ปิด"><Icon name="close" size={18} /></button>
    <span class="deco"><Asterisk size={26} color="var(--acc)" /></span>

    <div class="media" on:pointerdown={onDown} on:pointerup={onUp} role="presentation">
      {#if photo && imgOk}
        <img src={photo} alt={client.name} on:error={() => (imgOk = false)} />
      {:else}
        <div class="mono-fill"><Monogram name={client.name} size={96} /></div>
      {/if}
      {#if photos.length > 1}
        <button class="slide prev" on:click|stopPropagation={(e) => step(-1, e)} aria-label="รูปก่อนหน้า"><Icon name="chevron-right" size={20} /></button>
        <button class="slide next" on:click|stopPropagation={(e) => step(1, e)} aria-label="รูปถัดไป"><Icon name="chevron-right" size={20} /></button>
        <span class="slide-count">{photoIndex + 1} / {photos.length}</span>
      {/if}
    </div>

    <div class="content">
      <div class="tags">
        {#if pay}<Badge tone={pay.tone} icon="bolt">{pay.label}</Badge>{:else}<Badge tone="default">ทั่วไป</Badge>{/if}
        {#if client.photos.length}<Badge tone="default" icon="photo">มีรูป {client.photos.length}</Badge>{/if}
        {#if client.note}<Badge tone="acc" icon="note">มีโน้ต</Badge>{/if}
        <Badge tone="default">#{client.id.slice(0, 8)}</Badge>
      </div>

      <h2 class="title">{client.name}</h2>
      {#if client.customer}<p class="subtitle">ลูกค้า · {client.customer}</p>{/if}
      {#if client.branch}<p class="subtitle">สาขา · {client.branch}</p>{/if}

      <div class="section">
        <h3>รายละเอียด</h3>
        <dl class="meta">
          <div><dt>ที่อยู่</dt><dd>{client.address || '—'}</dd></div>
          <div><dt>สร้างเมื่อ</dt><dd>{fmtDateTime(client.createdAt)}</dd></div>
          <div><dt>อัปเดตล่าสุด</dt><dd>{fmtDateTime(client.updatedTs)}</dd></div>
          <div><dt>ลูกค้า</dt><dd>{client.customer || '—'}</dd></div>
          {#if client.branch}<div><dt>สาขา</dt><dd>{client.branch}</dd></div>{/if}
          <div><dt>การชำระ</dt><dd>{pay ? pay.label : 'เก็บเงิน'}</dd></div>
          <div><dt>รหัส</dt><dd class="mono-id">{client.id}</dd></div>
        </dl>
      </div>

      {#if hasCoords}
        <div class="section">
          <h3>พิกัด</h3>
          <div class="coord">
            <span class="coord-txt">{client.lat.toFixed(6)}, {client.lng.toFixed(6)}</span>
            <a href={mapsUrl} target="_blank" rel="noreferrer">เปิด Google Maps →</a>
          </div>
        </div>
      {/if}

      {#if client.note}
        <div class="section">
          <h3>โน้ต</h3>
          <div class="note">
            <Icon name="note" size={16} />
            <p>{client.note}</p>
          </div>
        </div>
      {/if}

      <div class="actions">
        <Button icon="copy" on:click={copyAll}>{copiedAll ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูล'}</Button>
        <Button icon="link" on:click={copyLink}>{copiedLink ? 'คัดลอกแล้ว' : 'ลิงก์'}</Button>
        {#if $auth.signedIn}
          <Button variant="soft" icon="edit" on:click={() => openEditor({
            id: client.id,
            name: client.names?.length ? client.names : [client.customer],
            shopName: client.shopNames?.length ? client.shopNames : [client.name],
            branch: client.branch,
            address: client.address,
            lat: client.lat,
            lng: client.lng,
            images: client.photos,
            badge: client.payment === 'day' ? 'penpay' : client.payment === 'card' ? 'credit' : null,
            notes: client.note,
          })}>แก้ไข</Button>
        {/if}
        <Button variant="ghost" iconRight="arrow-right" on:click={() => dispatch('close')}>ปิด</Button>
      </div>

      <p class="foot">record {client.id} · สร้าง {fmtDateTime(client.createdAt)}</p>
    </div>
  </section>
</div>

{#if lightbox !== null && client.photos[lightbox]}
  <div class="lightbox" role="presentation" on:click={(e) => e.target === e.currentTarget && (lightbox = null)}>
    <img src={client.photos[lightbox]} alt={`รูปที่ ${lightbox + 1}`} />
    {#if client.photos.length > 1}
      <button class="lb-nav prev" aria-label="รูปก่อนหน้า" on:click={(e) => step(-1, e)}>‹</button>
      <button class="lb-nav next" aria-label="รูปถัดไป" on:click={(e) => step(1, e)}>›</button>
      <span class="lb-count">{photoIndex + 1} / {photos.length}</span>
    {/if}
    <button class="lb-close" on:click={(e) => { burstAt(e, { tone: 'pri', size: 34 }); lightbox = null; }} aria-label="ปิดรูป">ปิด</button>
  </div>
{/if}

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
    width: min(90vw, 360px);
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

  .media { position: relative; width: 100%; aspect-ratio: 16 / 11; background: var(--paper-3); overflow: hidden; cursor: zoom-in; touch-action: pan-y; }
  .media img { width: 100%; height: 100%; object-fit: cover; }
  .slide {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 34px; height: 34px; display: grid; place-items: center;
    border: 1px solid var(--line); border-radius: 50%;
    background: color-mix(in srgb, var(--paper) 82%, transparent); color: var(--ink);
    box-shadow: var(--shadow-sm); cursor: pointer;
  }
  .slide.prev { left: 10px; }
  .slide.prev :global(svg) { transform: rotate(180deg); }
  .slide.next { right: 10px; }
  .slide:hover { background: var(--pri); color: var(--pri-ink); }
  .slide:active, .lb-nav:active, .lb-close:active { transform: scale(.9); }
  .slide-count {
    position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
    padding: 3px 9px; border-radius: var(--r-pill);
    background: color-mix(in srgb, var(--paper) 85%, transparent); color: var(--ink-2);
    font-family: var(--font-fun); font-size: var(--fs-2xs); pointer-events: none;
  }
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
    color: var(--ink); margin-bottom: 4px;
  }
  .subtitle { margin: 0 0 2px; font-size: var(--fs-sm); color: var(--ink-3); }

  .section { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
  .section h3 {
    margin: 0 0 12px; font-size: var(--fs-2xs); font-weight: 700;
    text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3);
  }
  .meta { display: grid; grid-template-columns: 1fr; gap: 12px 18px; margin: 0; }
  .meta div { display: grid; grid-template-columns: 118px 1fr; gap: 10px; align-items: start; }
  .meta dt { font-size: var(--fs-xs); color: var(--ink-3); font-weight: 600; }
  .meta dd { margin: 0; font-size: var(--fs-sm); color: var(--ink); line-height: 1.5; overflow-wrap: anywhere; }
  .mono-id { font-family: var(--font-fun); letter-spacing: .02em; font-size: var(--fs-xs); }

  .coord { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  .coord-txt { font-family: var(--font-fun); font-size: var(--fs-xs); color: var(--ink-2); }
  .coord a { font-size: var(--fs-sm); font-weight: 700; color: var(--pri); text-decoration: none; }
  .coord a:hover { text-decoration: underline; }

  .note {
    display: flex; gap: 10px; align-items: flex-start;
    background: var(--acc-soft); color: color-mix(in srgb, var(--acc) 70%, var(--ink));
    padding: 13px 15px; border-radius: var(--r-md);
    border: 1px solid color-mix(in srgb, var(--acc) 25%, transparent);
  }
  .note p { margin: 0; font-size: var(--fs-sm); line-height: 1.55; white-space: pre-wrap; }

  .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; }
  .foot { margin: 18px 0 0; font-size: var(--fs-2xs); color: var(--ink-3); font-family: var(--font-fun); overflow-wrap: anywhere; }

  .lightbox {
    position: fixed; inset: 0; z-index: 9000; background: var(--scrim);
    display: grid; place-items: center; padding: 24px;
  }
  .lightbox img { max-width: 100%; max-height: 82vh; object-fit: contain; }
  .lb-nav, .lb-close {
    position: absolute; border: none; border-radius: var(--r-pill);
    background: var(--paper-2); color: var(--ink); font-weight: 700; cursor: pointer;
  }
  .lb-nav { top: 50%; width: 44px; height: 44px; font-size: 24px; }
  .lb-nav.prev { left: 20px; }
  .lb-nav.next { right: 20px; }
  .lb-close { top: 20px; right: 20px; padding: 8px 16px; }
  .lb-count { position: absolute; bottom: 24px; font-family: var(--font-fun); color: var(--ink); }
</style>
