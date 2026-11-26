<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { editing, closeEditor, setView, openRecord } from '../lib/ui.js';
  import { auth } from '../lib/auth.js';
  import { saveClient } from '../lib/write.js';
  import { loadClients, clients } from '../lib/data.js';
  import { toast } from '../lib/effects.js';
  import Icon from '../components/Icon.svelte';
  import Asterisk from '../components/Asterisk.svelte';
  import Button from '../components/Button.svelte';
  import Segmented from '../components/Segmented.svelte';
  import MapPicker from '../components/MapPicker.svelte';
  import LocationSection from '../components/LocationSection.svelte';
  import PhotoUploadModal from '../components/PhotoUploadModal.svelte';

  let name = [''];
  let shopName = [''];
  let branch = '';
  let address = '';
  let lat = '';
  let lng = '';
  let images = [];
  let thumbs = {};
  let photoModal = false;
  const MAX_IMAGES = 2;
  let originalImages = [];
  let badge = null;
  let notes = '';
  let error = '';
  let saving = false;

  const asList = (v) => Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
  const parseNames = (v) => {
    const vals = asList(v);
    if (vals.length === 1 && typeof vals[0] === 'string' && vals[0].startsWith('[')) {
      try { return asList(JSON.parse(vals[0])); } catch { /* legacy string */ }
    }
    return vals.length ? vals : [''];
  };

  $: source = $editing;
  $: isEdit = !!source?.id;

  onMount(() => {
    if (!$auth.signedIn) { setView('ledger'); return; }
    if (!source) return;
    name = parseNames(source.name);
    shopName = parseNames(source.shopName);
    branch = source.branch || '';
    address = source.address || '';
    lat = source.lat != null ? String(source.lat) : '';
    lng = source.lng != null ? String(source.lng) : '';
    images = asList(source.images).filter((x) => typeof x === 'string' && x);
    originalImages = [...images];
    thumbs = {};
    badge = source.badge || null;
    notes = source.notes || '';
  });

  function addToList(which) {
    if (which === 'name') name = [...name, ''];
    else shopName = [...shopName, ''];
  }
  function setAt(which, i, value) {
    const list = which === 'name' ? [...name] : [...shopName];
    list[i] = value;
    if (which === 'name') name = list; else shopName = list;
  }
  function setCoords(a, b) { lat = String(a); lng = String(b); }
  function removePhoto(i) {
    const removed = images[i];
    images = images.filter((_, idx) => idx !== i);
    if (removed && removed in thumbs) {
      const next = { ...thumbs };
      delete next[removed];
      thumbs = next;
    }
  }

  async function save() {
    if (saving || !$auth.signedIn) return;
    saving = true;
    error = '';
    try {
      const saved = await saveClient({
        id: source?.id || null,
        name: name.map((x) => x.trim()).filter(Boolean),
        shopName: shopName.map((x) => x.trim()).filter(Boolean),
        branch: branch.trim(),
        address: address.trim(),
        lat: lat !== '' ? Number(lat) : null,
        lng: lng !== '' ? Number(lng) : null,
        images,
        thumbs,
        originalImages,
        badge,
        notes: notes.trim() || null,
      });
      await loadClients(true);
      toast('บันทึกระเบียนแล้ว', { tone: 'ok', icon: 'check' });
      closeEditor();
      const found = get(clients).find((c) => c.id === saved.id);
      if (found) openRecord(found);
    } catch (e) {
      error = e?.message || 'บันทึกไม่สำเร็จ';
    } finally {
      saving = false;
    }
  }
</script>

<section class="wrap page">
  <header class="head">
    <div class="head-left">
      <span class="eyebrow"><Asterisk size={13} color="var(--pri)" /> {isEdit ? 'แก้ไข' : 'เพิ่มรายการ'}</span>
      <h1>{isEdit ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h1>
    </div>
    <Button variant="ghost" size="sm" icon="close" on:click={closeEditor}>ยกเลิก</Button>
  </header>

  <div class="form">
    <div class="field">
      <span class="label">ชื่อลูกค้า</span>
      {#each name as n, i}
        <div class="input-row">
          <input value={n} on:input={(e) => setAt('name', i, e.currentTarget.value)} placeholder="ชื่อลูกค้า" />
          {#if name.length > 1}<button class="mini" aria-label="ลบชื่อ" on:click={() => (name = name.filter((_, x) => x !== i))}><Icon name="x" size={14} /></button>{/if}
        </div>
      {/each}
      <button class="add" on:click={() => addToList('name')}><Icon name="plus" size={14} /> เพิ่มชื่อ</button>
    </div>

    <div class="field">
      <span class="label">ชื่อร้าน</span>
      {#each shopName as s, i}
        <div class="input-row">
          <input value={s} on:input={(e) => setAt('shopName', i, e.currentTarget.value)} placeholder="ชื่อร้าน" />
          {#if shopName.length > 1}<button class="mini" aria-label="ลบชื่อร้าน" on:click={() => (shopName = shopName.filter((_, x) => x !== i))}><Icon name="x" size={14} /></button>{/if}
        </div>
      {/each}
      <button class="add" on:click={() => addToList('shopName')}><Icon name="plus" size={14} /> เพิ่มชื่อร้าน</button>
    </div>

    <div class="grid2">
      <div class="field"><span class="label">สาขา</span><input bind:value={branch} placeholder="สาขา" /></div>
      <div class="field"><span class="label">ที่อยู่</span><input bind:value={address} placeholder="ที่อยู่" /></div>
    </div>

    <div class="field">
      <span class="label">ตำแหน่ง</span>
      <MapPicker lat={lat !== '' ? Number(lat) : null} lng={lng !== '' ? Number(lng) : null} onChange={setCoords} />
      <LocationSection lat={lat !== '' ? Number(lat) : null} lng={lng !== '' ? Number(lng) : null} onChange={setCoords} />
    </div>

    <div class="field">
      <span class="label">ประเภทชำระ</span>
      <Segmented
        options={[{ id: 'none', label: 'เก็บเงิน' }, { id: 'penpay', label: 'วางบิล' }, { id: 'credit', label: 'บัตรเครดิต' }]}
        value={badge || 'none'}
        on:change={(e) => (badge = e.detail === 'none' ? null : e.detail)}
      />
    </div>

    <div class="field">
      <span class="label">โน้ต</span>
      <textarea bind:value={notes} rows="3" placeholder="โน้ตเพิ่มเติม"></textarea>
    </div>

    <div class="field">
      <span class="label">รูปภาพ</span>
      <div class="photos">
        {#each images as src, i}
          <div class="photo">
            <img {src} alt={`รูป ${i + 1}`} />
            <button class="rm" aria-label="ลบรูป" on:click={() => removePhoto(i)}><Icon name="x" size={13} /></button>
          </div>
        {/each}
        {#if images.length < MAX_IMAGES}
          <button class="upload" on:click={() => (photoModal = true)}><Icon name="photo" size={18} /><span>{images.length}/{MAX_IMAGES}</span></button>
        {/if}
      </div>
      <PhotoUploadModal open={photoModal} onClose={() => (photoModal = false)} onCompressed={(data, thumb) => { if (images.length < MAX_IMAGES) { images = [...images, data]; thumbs = { ...thumbs, [data]: thumb }; } }} />
    </div>

    {#if error}<p class="err">{error}</p>{/if}

    <div class="actions">
      <Button icon="check" on:click={save} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
      <Button variant="ghost" on:click={closeEditor}>ยกเลิก</Button>
    </div>
  </div>
</section>

<style>
  .page { padding-top: 22px; padding-bottom: 60px; }
  .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid var(--line-2); }
  .head-left { display: flex; flex-direction: column; }
  .eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); font-weight: 700; color: var(--pri); text-transform: uppercase; letter-spacing: .08em; }
  .head h1 { font-family: var(--font-display); font-size: var(--fs-2xl); font-weight: 700; margin-top: 4px; }
  .form { display: flex; flex-direction: column; gap: 18px; margin-top: 20px; max-width: 760px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .label { font-size: var(--fs-xs); font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: .06em; }
  input, textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-xs); background: var(--paper-2); color: var(--ink); font: inherit; font-size: var(--fs-sm); outline: none; }
  input:focus, textarea:focus { border-color: var(--pri); box-shadow: var(--ring); }
  .input-row { display: flex; gap: 6px; }
  .mini, .rm { border: none; background: var(--paper-3); color: var(--ink-2); border-radius: var(--r-xs); display: grid; place-items: center; padding: 6px; cursor: pointer; }
  .add { align-self: flex-start; border: none; background: none; color: var(--pri); font-weight: 700; font-size: var(--fs-xs); display: inline-flex; align-items: center; gap: 4px; padding: 2px 0; cursor: pointer; }
  .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
  .photo { position: relative; aspect-ratio: 1; border: 1px solid var(--line); border-radius: var(--r-xs); overflow: hidden; background: var(--paper-3); }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .rm { position: absolute; top: 4px; right: 4px; background: var(--paper); }
  .upload { aspect-ratio: 1; border: 1.5px dashed var(--line-2); border-radius: var(--r-xs); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--ink-2); font-size: var(--fs-xs); cursor: pointer; }
  .upload input { display: none; }
  .err { color: #b33; font-size: var(--fs-sm); }
  .actions { display: flex; gap: 10px; }
</style>
