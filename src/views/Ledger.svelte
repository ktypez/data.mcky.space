<script>
  import { query, counts, FILTERS, clients, loading, errorMsg, total, loadClients } from '../lib/data.js';
  import { openRecord, openEditor } from '../lib/ui.js';
  import { auth } from '../lib/auth.js';
  import SearchInput from '../components/SearchInput.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Chip from '../components/Chip.svelte';
  import ClientRow from '../components/ClientRow.svelte';
  import Icon from '../components/Icon.svelte';
  import Asterisk from '../components/Asterisk.svelte';
  import { burstAt } from '../lib/effects.js';

  let q = '';
  let filterId = 'all';
  let sortId = 'recent';

  $: cnt = counts($clients);
  const sortOptions = [
    { id: 'recent', label: 'ล่าสุด' },
    { id: 'name', label: 'ชื่อ' }
  ];

  $: list = query({ q, filter: filterId, sort: sortId }, $clients);

  function onOpen(e) { openRecord(e.detail); }

  let filterOpen = false;
  function chooseFilter(id) { filterId = id; filterOpen = false; }

  function onWindowDown(e) {
    if (!filterOpen) return;
    const el = e.target;
    if (el instanceof Element && el.closest('.fabs')) return;
    filterOpen = false;
  }
</script>

<svelte:window on:pointerdown={onWindowDown} />

<section class="wrap page">
  <header class="head">
    <div class="head-left">
      <span class="eyebrow"><Asterisk size={13} color="var(--pri)" /> สมุดทะเบียน</span>
      <h1>รายการทั้งหมด</h1>
    </div>
    <div class="head-right">
      <span class="count tnum">{list.length}</span>
      <span class="dim">จาก {$total || cnt.all} รายการ</span>
    </div>
  </header>

  <div class="toolbar">
    <div class="grow"><SearchInput bind:value={q} placeholder="ค้นหาชื่อร้าน, ลูกค้า, โน้ต…" hint={['⌘', 'K']} /></div>
    <Segmented options={sortOptions} bind:value={sortId} />
  </div>

  {#if $loading}
    <div class="empty">
      <div class="empty-art"><Icon name="sparkles" size={28} /></div>
      <h3>กำลังโหลดข้อมูล...</h3>
    </div>
  {:else if $errorMsg}
    <div class="empty">
      <div class="empty-art"><Icon name="info" size={28} /></div>
      <h3>โหลดข้อมูลไม่สำเร็จ</h3>
      <p class="muted">{$errorMsg}</p>
      <button class="link-btn" on:click={(e) => { burstAt(e, { tone: 'acc', size: 34 }); loadClients(true); }}>ลองใหม่</button>
    </div>
  {:else if list.length === 0}
    <div class="empty">
      <div class="empty-art"><Icon name="search" size={28} /></div>
      <h3>ไม่พบรายการ</h3>
      <p class="muted">ลองเปลี่ยนคำค้นหา หรือยกเลิกตัวกรองดูสิ</p>
      <button class="link-btn" on:click={(e) => { burstAt(e, { tone: 'pri', size: 34 }); q = ''; filterId = 'all'; }}>ล้างทั้งหมด</button>
    </div>
  {:else}
    <div class="list">
      <div class="lhead" aria-hidden="true">
        <span></span>
        <span>ลูกค้า</span>
        <span>สถานะ</span>
        <span class="r">อัปเดต</span>
        <span></span>
      </div>
      {#each list as c (c.id)}
        <ClientRow client={c} on:open={onOpen} />
      {/each}
    </div>
  {/if}

  <div class="fabs">
    {#if filterOpen}
      <button class="filter-scrim" aria-label="ปิดตัวกรอง" on:click={() => (filterOpen = false)}></button>
    {/if}
    {#if filterOpen}
      <div class="filter-panel" role="group" aria-label="ตัวกรอง">
        <div class="filter-title">ตัวกรอง</div>
        {#each FILTERS as f}
          <Chip active={filterId === f.id} count={cnt[f.id]} on:click={() => chooseFilter(f.id)}>{f.label}</Chip>
        {/each}
      </div>
    {/if}
    <button class="fab filter {filterOpen ? 'on' : ''}" on:click={(e) => { burstAt(e, { tone: filterOpen ? 'pri' : 'acc', size: 44, n: 8 }); filterOpen = !filterOpen; }} aria-label="ตัวกรอง" title="ตัวกรอง">
      <Icon name="filter" size={20} />
    </button>
    {#if $auth.signedIn}
      <button class="fab add" on:click={(e) => { burstAt(e, { tone: 'pri', size: 50, n: 10 }); openEditor(null); }} aria-label="เพิ่มรายการ" title="เพิ่มรายการ">
        <Icon name="plus" size={22} />
      </button>
    {/if}
  </div>
</section>

<style>
  .page { padding-top: 22px; padding-bottom: 60px; }

  .head {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; padding-bottom: 16px; border-bottom: 2px solid var(--line-2);
  }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: var(--fs-xs); font-weight: 700; color: var(--pri);
    text-transform: uppercase; letter-spacing: .08em;
  }
  .head h1 {
    font-family: var(--font-display); font-size: var(--fs-2xl);
    font-weight: 700; margin-top: 4px; letter-spacing: -0.01em;
  }
  .head-right { display: flex; align-items: baseline; gap: 6px; white-space: nowrap; }
  .count { font-family: var(--font-display); font-size: var(--fs-xl); font-weight: 700; color: var(--pri); }
  .head-right .dim { font-size: var(--fs-sm); }

  .toolbar {
    position: sticky; top: 0; z-index: 60;
    display: flex; gap: 10px; align-items: center; margin-top: 14px;
    padding: 8px 0;
    background: color-mix(in srgb, var(--paper) 94%, transparent);
    backdrop-filter: blur(8px);
  }
  .grow { flex: 1; min-width: 0; }

  .fabs { position: fixed; right: 22px; bottom: 22px; z-index: 500; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
  .filter-scrim {
    position: fixed; inset: 0; z-index: 0;
    width: 100vw; height: 100dvh;
    border: none; padding: 0; margin: 0;
    background: transparent; cursor: default;
  }
  .filter-panel, .fabs > .fab { position: relative; z-index: 1; }
  .fab {
    width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center;
    border: 1px solid var(--line); cursor: pointer;
    background: var(--paper-2); color: var(--ink-2); box-shadow: var(--shadow-pop);
    transition: transform var(--dur-fast) var(--ease-spring), background var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
  }
  .fab:hover { transform: translateY(-2px) scale(1.04); }
  .fab:active { transform: scale(.9); }
  .fab.filter.on { background: var(--pri); color: var(--pri-ink); }
  .fab.add { width: 58px; height: 58px; background: var(--pri-fill); color: var(--pri-ink); }
  .filter-panel {
    display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px;
    max-width: min(440px, calc(100vw - 44px)); padding: 12px;
    background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md);
    box-shadow: var(--shadow-lg);
  }
  .filter-title { flex: 1 0 100%; text-align: right; font-size: var(--fs-2xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); }
  @media (max-width: 560px) { .fabs { right: 14px; bottom: 14px; } }

  .list {
    margin-top: 16px;
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    overflow: hidden;
    background: var(--paper-2);
  }
  .lhead {
    display: grid;
    grid-template-columns: 40px minmax(0, 1.5fr) minmax(0, 1fr) 96px 34px;
    gap: 14px;
    padding: 9px 16px;
    background: var(--paper-3);
    border-bottom: 1px solid var(--line);
    font-size: var(--fs-2xs); font-weight: 700; color: var(--ink-3);
    text-transform: uppercase; letter-spacing: .06em;
  }
  .lhead .r { text-align: right; }

  @media (max-width: 760px) {
    .lhead { grid-template-columns: 40px minmax(0, 1fr) 84px 34px; gap: 10px; padding: 9px 12px; }
    .lhead span:nth-child(3) { display: none; }
  }

  .empty {
    text-align: center; padding: 56px 20px; color: var(--ink-2);
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    border: 1px dashed var(--line-2); border-radius: var(--r-md); margin-top: 16px;
  }
  .empty-art {
    width: 64px; height: 64px; border-radius: var(--r-md);
    display: grid; place-items: center; margin-bottom: 4px;
    background: var(--paper-3); color: var(--pri);
  }
  .empty h3 { font-family: var(--font-display); font-size: var(--fs-lg); color: var(--ink); }
  .link-btn { border: none; background: none; color: var(--pri); font-weight: 700; font-size: var(--fs-sm); }
  .link-btn:hover { text-decoration: underline; }
</style>
