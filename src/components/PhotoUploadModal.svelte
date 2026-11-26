<script>
  import { compressImage, makeThumbDataUrl } from '../lib/compressImage.js';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';

  export let open = false;
  export let onClose = () => {};
  export let onCompressed = () => {};

  let originalSize = 0;
  let compressedSize = 0;
  let previewUrl = null;
  let dataUrl = null;
  let thumbUrl = null;
  let compressing = false;
  let error = '';
  let dragOver = false;

  const fmt = (b) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  const looksImage = (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name);

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    originalSize = 0; compressedSize = 0; previewUrl = null; dataUrl = null; thumbUrl = null; compressing = false; error = '';
  }
  function close() { reset(); onClose(); }

  async function handleFile(f) {
    if (!looksImage(f)) { error = 'ไฟล์นี้ไม่ใช่รูปภาพ — เลือก JPEG, PNG หรือ WebP'; return; }
    if (f.size > 10 * 1024 * 1024) { error = 'ไฟล์ใหญ่เกิน 10 MB'; return; }
    error = ''; originalSize = f.size; compressing = true;
    try {
      const compressed = await compressImage(f);
      const reader = new FileReader();
      const url = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(compressed); });
      compressedSize = compressed.size;
      previewUrl = URL.createObjectURL(compressed);
      dataUrl = url;
      thumbUrl = await makeThumbDataUrl(compressed);
    } catch {
      const reader = new FileReader();
      const url = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(f); });
      compressedSize = f.size; previewUrl = URL.createObjectURL(f); dataUrl = url;
      thumbUrl = await makeThumbDataUrl(f);
      if (f.size > 2 * 1024 * 1024) error = 'ไม่สามารถบีบอัดรูปได้ — ส่งไฟล์ต้นฉบับ';
    } finally { compressing = false; }
  }
  function confirm() { if (!dataUrl) return; onCompressed(dataUrl, thumbUrl); close(); }
</script>

{#if open}
  <div class="scrim" on:click={(e) => e.target === e.currentTarget && close()} role="presentation">
    <section class="modal" role="dialog" aria-modal="true" aria-label="เพิ่มรูปร้านค้า">
      <button class="close" on:click={close} aria-label="ปิด"><Icon name="close" size={16} /></button>
      <h2>เพิ่มรูปร้านค้า</h2>
      {#if !dataUrl && !compressing}
        <label class="drop" class:over={dragOver} on:dragover={(e) => { e.preventDefault(); dragOver = true; }} on:dragleave={() => (dragOver = false)} on:drop={(e) => { e.preventDefault(); dragOver = false; const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); }}>
          <Icon name="photo" size={28} />
          <b>ลากมาวาง หรือแตะเพื่อเลือกรูป</b>
          <span>JPEG, PNG</span>
          <input type="file" accept="image/*" on:change={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </label>
      {:else if compressing}
        <div class="busy">กำลังบีบอัดรูป…</div>
      {:else}
        {#if previewUrl}<img src={previewUrl} alt="ตัวอย่างรูป" />{/if}
        <p class="size">{#if originalSize !== compressedSize}<s>{fmt(originalSize)}</s> → {fmt(compressedSize)}{:else}{fmt(compressedSize)}{/if}</p>
      {/if}
      {#if error}<p class="err">{error}</p>{/if}
      <div class="actions">
        <Button variant="ghost" on:click={close}>ยกเลิก</Button>
        {#if dataUrl && !compressing}<Button icon="check" on:click={confirm}>เพิ่มรูป</Button>{/if}
      </div>
    </section>
  </div>
{/if}

<style>
  .scrim { position: fixed; inset: 0; z-index: 8500; background: var(--scrim); backdrop-filter: blur(3px); display: grid; place-items: center; padding: 20px; }
  .modal { position: relative; width: min(92vw, 380px); padding: 22px; border-radius: var(--r-md); border: 1px solid var(--line); background: var(--paper); box-shadow: var(--shadow-lg); }
  .modal h2 { margin: 0 0 16px; font-family: var(--font-display); font-size: var(--fs-lg); }
  .close { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; display: grid; place-items: center; border: none; border-radius: 50%; background: var(--paper-2); color: var(--ink-2); cursor: pointer; }
  .drop { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; border: 2px dashed var(--line-2); border-radius: var(--r-sm); color: var(--ink-2); cursor: pointer; text-align: center; }
  .drop.over { border-color: var(--pri); background: var(--pri-soft); }
  .drop b { font-size: var(--fs-sm); }
  .drop span { font-size: var(--fs-xs); color: var(--ink-3); }
  .drop input { display: none; }
  .busy { padding: 40px; text-align: center; color: var(--ink-2); }
  .modal img { width: 100%; height: 170px; object-fit: cover; border-radius: var(--r-sm); }
  .size { font-size: var(--fs-xs); color: var(--ink-3); }
  .err { color: #b33; font-size: var(--fs-xs); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
