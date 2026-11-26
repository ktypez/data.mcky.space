<script>
  import { onMount } from 'svelte';
  import { auth, login } from '../lib/auth.js';
  import { loadClients } from '../lib/data.js';
  import { fetchTrash, trashAction } from '../lib/write.js';
  import { fmtDateTime } from '../lib/format.js';
  import { toast, burstAt } from '../lib/effects.js';
  import { setView } from '../lib/ui.js';
  import Icon from '../components/Icon.svelte';
  import Badge from '../components/Badge.svelte';
  import Monogram from '../components/Monogram.svelte';
  import Button from '../components/Button.svelte';
  import Asterisk from '../components/Asterisk.svelte';

  const TTL_DAYS = 30;
  const daysLeft = (at) => Math.max(0, TTL_DAYS - Math.floor((Date.now() - Number(at || 0)) / 86_400_000));
  const displayName = (c) => (c.shopNames?.[0] || c.name?.[0] || c.id || 'ไม่มีชื่อ');
  const customer = (c) => c.names?.[0] || '';
  const photo = (c) => c.images?.[0] || null;

  let items = [];
  let loading = true;
  let errorMsg = '';
  let busyId = null;
  let confirmItem = null;
  let focused = 0;
  let rowEls = [];
  let loadedFor = false;

  async function fetchItems() {
    loading = true;
    errorMsg = '';
    try {
      const rows = await fetchTrash();
      items = Array.isArray(rows) ? rows : [];
      focused = Math.min(focused, Math.max(items.length - 1, 0));
    } catch (e) {
      errorMsg = 'โหลดถังขยะไม่สำเร็จ';
    } finally {
      loading = false;
    }
  }

  $: if ($auth.signedIn && !loadedFor) { loadedFor = true; void fetchItems(); }
  $: if (!$auth.signedIn) { loadedFor = false; loading = false; }

  async function restore(c) {
    if (busyId) return;
    busyId = c.id;
    errorMsg = '';
    try {
      await trashAction(c.id, 'restore');
      items = items.filter((x) => x.id !== c.id);
      toast(`กู้คืน “${displayName(c)}” แล้ว`, { tone: 'ok', icon: 'check' });
      void loadClients(true).catch(() => {});
    } catch {
      errorMsg = 'กู้คืนไม่สำเร็จ';
      toast('กู้คืนไม่สำเร็จ', { tone: 'warn', icon: 'info' });
    } finally {
      busyId = null;
    }
  }

  async function forceDelete(c) {
    if (busyId) return;
    busyId = c.id;
    errorMsg = '';
    try {
      await trashAction(c.id, 'force-delete');
      items = items.filter((x) => x.id !== c.id);
      toast(`ลบ “${displayName(c)}” ถาวรแล้ว`, { tone: 'warn', icon: 'trash' });
      confirmItem = null;
    } catch {
      errorMsg = 'ลบไม่สำเร็จ';
      toast('ลบไม่สำเร็จ', { tone: 'warn', icon: 'info' });
    } finally {
      busyId = null;
    }
  }

  function focusRow(i) { focused = i; rowEls[i]?.focus(); }
  function onRowKey(e, i) {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusRow(Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusRow(Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); void restore(items[i]); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); confirmItem = items[i]; }
  }

  onMount(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && confirmItem && !busyId) confirmItem = null;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<section class="wrap page">
  <header class="head">
    <div class="head-left">
      <span class="eyebrow"><Asterisk size={13} color="var(--pri)" /> ถังขยะ</span>
      <h1>รายการที่ลบ</h1>
      <p class="dim">กู้คืนได้ภายใน {TTL_DAYS} วัน หลังจากนั้นจะถูกลบถาวร</p>
    </div>
    <span class="count tnum">{items.length} <small>รายการ</small></span>
  </header>

  {#if $auth.checking}
    <div class="note">กำลังตรวจสิทธิ์…</div>
  {:else if !$auth.signedIn}
    <div class="note">
      <Icon name="info" size={20} />
      <p>เข้าสู่ระบบเพื่อดูถังขยะ</p>
      <Button variant="soft" icon="arrow-right" on:click={() => login()}>เข้าสู่ระบบ</Button>
    </div>
  {:else}
    <div class="hint">
      <Icon name="info" size={17} />
      <span>รายการที่ลบจะอยู่ที่นี่ {TTL_DAYS} วัน แล้วถูกลบถาวร</span>
    </div>

    {#if errorMsg}<p class="err" role="alert">{errorMsg}</p>{/if}

    <div class="list" role="list" aria-label="รายการถังขยะ">
      <div class="lhead"><span>รายการ</span><span>หมดอายุ</span><span>การทำงาน</span></div>
      {#if loading}
        <div class="empty">กำลังโหลดถังขยะ…</div>
      {:else if items.length === 0}
        <div class="empty">
          <span class="empty-mark"><Asterisk size={28} color="var(--pri)" /></span>
          <h2>ถังขยะว่าง</h2>
          <p class="dim">รายการที่ลบจะมาอยู่ที่นี่</p>
          <Button variant="soft" size="sm" on:click={() => setView('ledger')}>กลับไปหน้ารายการ</Button>
        </div>
      {:else}
        {#each items as c, i (c.id)}
          <div class="row" class:active={i === focused} role="listitem" on:mouseenter={() => (focused = i)}>
            <button
              bind:this={rowEls[i]}
              class="who"
              on:focus={() => (focused = i)}
              on:keydown={(e) => onRowKey(e, i)}
              on:click={() => void restore(c)}
              disabled={busyId === c.id}
              aria-label={'กู้คืน ' + displayName(c)}
            >
              <span class="ava">
                {#if photo(c)}
                  <img src={photo(c)} alt="" loading="lazy" />
                {:else}
                  <Monogram name={displayName(c)} size={40} />
                {/if}
              </span>
              <span class="who-text">
                <b>{displayName(c)}</b>
                <small>{customer(c) || 'ไม่มีชื่อลูกค้า'}</small>
                <span class="stamp">ลบเมื่อ {fmtDateTime(c.deletedAt)}</span>
              </span>
            </button>
            <Badge tone={daysLeft(c.deletedAt) <= 7 ? 'warn' : 'default'} size="sm">เหลือ {daysLeft(c.deletedAt)} วัน</Badge>
            <div class="acts">
              <button class="mini restore" on:click|stopPropagation={(e) => { burstAt(e, { tone: 'ok', size: 30 }); void restore(c); }} disabled={busyId === c.id} title="กู้คืน">
                <Icon name="check" size={16} /> <span>กู้คืน</span>
              </button>
              <button class="mini danger" on:click|stopPropagation={(e) => { burstAt(e, { tone: 'warn', size: 30 }); confirmItem = c; }} disabled={busyId === c.id} aria-label={'ลบถาวร ' + displayName(c)} title="ลบถาวร">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
    <p class="keys dim">↑↓ เลือก · Enter กู้คืน · Delete ลบถาวร</p>
  {/if}
</section>

{#if confirmItem}
  <div class="scrim" role="presentation" on:click={(e) => e.target === e.currentTarget && !busyId && (confirmItem = null)}>
    <div class="dialog" role="alertdialog" aria-modal="true" aria-label="ลบถาวร">
      <span class="dlg-icon"><Icon name="trash" size={24} /></span>
      <h2>ลบถาวร</h2>
      <p>“{displayName(confirmItem)}” จะหายไปจากระบบและกู้คืนไม่ได้</p>
      <div class="dlg-acts">
        <Button variant="ghost" size="sm" disabled={!!busyId} on:click={() => (confirmItem = null)}>ยกเลิก</Button>
        <Button variant="solid" tone="default" size="sm" disabled={!!busyId} on:click={() => void forceDelete(confirmItem)}>
          {busyId === confirmItem.id ? 'กำลังลบ…' : 'ลบถาวร'}
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { padding-top: 22px; padding-bottom: 56px; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--line-2); }
  .eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-2xs); font-weight: 700; color: var(--pri); letter-spacing: .08em; text-transform: uppercase; }
  h1 { margin: 4px 0 2px; font-size: var(--fs-3xl); }
  .head p { margin: 0; font-size: var(--fs-sm); }
  .count { font-family: var(--font-display); font-size: var(--fs-2xl); font-weight: 700; color: var(--pri); white-space: nowrap; }
  .count small { font-family: var(--font-sans); font-size: var(--fs-sm); color: var(--ink-3); }

  .hint { display: flex; align-items: center; gap: 10px; margin-top: 18px; padding: 12px 14px; border: 1px solid var(--pri); border-radius: var(--r-sm); background: var(--pri-soft); color: var(--pri-ink); font-size: var(--fs-sm); font-weight: 600; }
  .note { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 40px; padding: 32px; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--paper-2); text-align: center; color: var(--ink-2); }
  .note p { margin: 0; }
  .err { margin: 14px 0 0; padding: 10px 14px; border: 1px solid hsl(32 80% 60%); border-radius: var(--r-xs); background: hsl(38 95% 94%); color: hsl(32 80% 34%); font-size: var(--fs-sm); }
  :global([data-theme="dark"]) .err { background: hsl(36 60% 20%); color: hsl(36 90% 76%); }

  .list { margin-top: 18px; border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; background: var(--paper-2); }
  .lhead, .row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 9px 14px; }
  .lhead { background: var(--paper-3); border-bottom: 1px solid var(--line); color: var(--ink-3); font-size: var(--fs-2xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .row { border-bottom: 1px solid var(--line); min-height: 62px; transition: background-color var(--dur-fast) var(--ease-out); }
  .row:last-child { border-bottom: none; }
  .row:hover, .row.active { background: var(--pri-soft); }
  .who { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 0; border: none; background: none; text-align: left; cursor: pointer; }
  .who:disabled { cursor: default; }
  .ava { width: 40px; height: 40px; border-radius: var(--r-sm); overflow: hidden; flex: none; }
  .ava img { width: 100%; height: 100%; object-fit: cover; }
  .who-text { display: flex; flex-direction: column; min-width: 0; }
  .who-text b { font-size: var(--fs-md); color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who-text small { font-size: var(--fs-xs); color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stamp { font-family: var(--font-display); font-size: var(--fs-2xs); color: var(--ink-3); }
  .acts { display: flex; align-items: center; gap: 6px; }
  .mini { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border: 1px solid var(--line); border-radius: var(--r-pill); background: var(--paper); color: var(--ink-2); font-weight: 600; font-size: var(--fs-xs); cursor: pointer; transition: transform var(--dur-fast) var(--ease-spring), background var(--dur) var(--ease-out), color var(--dur) var(--ease-out); }
  .mini:hover { color: var(--pri); border-color: var(--pri); }
  .mini.danger:hover { color: hsl(0 70% 48%); border-color: hsl(0 70% 60%); }
  .mini:active { transform: scale(.94); }
  .mini:disabled { opacity: .5; cursor: default; }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 46px 20px; text-align: center; }
  .empty-mark { width: 56px; height: 56px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--pri-soft); }
  .empty h2 { margin: 0; font-size: var(--fs-lg); }
  .empty p { margin: 0; font-size: var(--fs-sm); }
  .keys { margin-top: 10px; font-size: var(--fs-2xs); text-align: right; }

  .scrim { position: fixed; inset: 0; z-index: 8000; display: grid; place-items: center; padding: 20px; background: var(--scrim); animation: fade .18s var(--ease-out) both; }
  .dialog { width: min(92vw, 360px); padding: 24px; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--paper); text-align: center; box-shadow: var(--shadow-lg); animation: pop .26s var(--ease-spring) both; }
  .dlg-icon { display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: var(--r-md); background: hsl(38 95% 92%); color: hsl(32 80% 38%); }
  :global([data-theme="dark"]) .dlg-icon { background: hsl(36 60% 24%); color: hsl(36 90% 74%); }
  .dialog h2 { margin: 12px 0 6px; font-size: var(--fs-xl); }
  .dialog p { margin: 0; font-size: var(--fs-sm); color: var(--ink-2); }
  .dlg-acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: none; } }
  @media (max-width: 620px) { .lhead span:nth-child(2), .row > :global(.badge) { display: none; } .lhead, .row { grid-template-columns: minmax(0, 1fr) auto; } .mini.restore span { display: none; } }
  @media (prefers-reduced-motion: reduce) { .scrim, .dialog { animation: none; } }
</style>
