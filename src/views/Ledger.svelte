<script>
  import { query, counts, FILTERS, clients, loading, errorMsg, total, loadClients } from '../lib/data.js';
  import { openRecord } from '../lib/ui.js';
  import SearchInput from '../components/SearchInput.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Chip from '../components/Chip.svelte';
  import ClientRow from '../components/ClientRow.svelte';
  import Icon from '../components/Icon.svelte';
  import Asterisk from '../components/Asterisk.svelte';

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
</script>

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

  <div class="chips">
    {#each FILTERS as f}
      <Chip active={filterId === f.id} count={cnt[f.id]} on:click={() => (filterId = f.id)}>
        {f.label}
      </Chip>
    {/each}
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
      <button class="link-btn" on:click={() => loadClients(true)}>ลองใหม่</button>
    </div>
  {:else if list.length === 0}
    <div class="empty">
      <div class="empty-art"><Icon name="search" size={28} /></div>
      <h3>ไม่พบรายการ</h3>
      <p class="muted">ลองเปลี่ยนคำค้นหา หรือยกเลิกตัวกรองดูสิ</p>
      <button class="link-btn" on:click={() => { q = ''; filterId = 'all'; }}>ล้างทั้งหมด</button>
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

  .toolbar { display: flex; gap: 10px; align-items: center; margin-top: 14px; }
  .grow { flex: 1; min-width: 0; }

  .chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }

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
