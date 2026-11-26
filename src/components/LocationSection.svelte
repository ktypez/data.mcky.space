<script>
  import { OpenLocationCode } from 'open-location-code';
  import Icon from './Icon.svelte';
  import { burstAt } from '../lib/effects.js';

  export let lat = null;
  export let lng = null;
  export let onChange = () => {};

  const olc = new OpenLocationCode();
  const CENTER = { lat: 16.4322, lng: 102.8236 };
  let query = '';
  let feedback = null;
  let locating = false;

  function parseCoords(s) {
    const t = s.trim();
    if (!t) return null;
    let m = t.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/);
    if (m) {
      const a = parseFloat(m[1]), b = parseFloat(m[2]);
      if (isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
    }
    m = t.match(/^(-?\d+\.?\d*)\s*°?\s*([NS]?)\s*[,;\s]\s*(-?\d+\.?\d*)\s*°?\s*([EW]?)$/i);
    if (m) {
      let a = parseFloat(m[1]), b = parseFloat(m[3]);
      if (m[2].toUpperCase() === 'S') a = -a;
      if (m[4].toUpperCase() === 'W') b = -b;
      if (isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
    }
    return null;
  }

  function search(e) {
    burstAt(e, { tone: 'acc', size: 30, n: 6 });
    const q = query.trim();
    if (!q) return;
    const coords = parseCoords(q);
    if (coords) {
      onChange(coords.lat, coords.lng);
      query = '';
      feedback = { ok: true, msg: `ตำแหน่ง: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` };
      return;
    }
    const code = (q.match(/[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i) || [])[0] || q;
    if (olc.isValid(code)) {
      try {
        const full = olc.isFull(code) ? code : olc.isShort(code) ? olc.recoverNearest(code, lat ?? CENTER.lat, lng ?? CENTER.lng) : null;
        if (full) {
          const d = olc.decode(full);
          onChange(d.latitudeCenter, d.longitudeCenter);
          query = '';
          feedback = { ok: true, msg: `ตำแหน่ง: ${d.latitudeCenter.toFixed(4)}, ${d.longitudeCenter.toFixed(4)}` };
          return;
        }
      } catch { /* fall through */ }
    }
    feedback = { ok: false, msg: 'ไม่รู้จักพิกัด — ลอง ละติจูด,ลองจิจูด หรือ Plus Code' };
  }

  function locate(e) {
    burstAt(e, { tone: 'acc', size: 34, n: 8 });
    if (!navigator.geolocation) { feedback = { ok: false, msg: 'อุปกรณ์นี้ไม่รองรับ Geolocation' }; return; }
    locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating = false;
        onChange(pos.coords.latitude, pos.coords.longitude);
        feedback = { ok: true, msg: 'ใช้ตำแหน่งปัจจุบันแล้ว' };
      },
      () => { locating = false; feedback = { ok: false, msg: 'ใช้ตำแหน่งไม่ได้ — อนุญาตการเข้าถึงที่ตั้งในเบราว์เซอร์' }; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
</script>

<div class="loc">
  <div class="row">
    <input bind:value={query} on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), search(e))} placeholder="ละติจูด, ลองจิจูด หรือ Plus Code" aria-label="ค้นหาตำแหน่ง" />
    <button class="mini" on:click={(e) => search(e)} aria-label="ค้นหาตำแหน่ง"><Icon name="search" size={16} /></button>
  </div>
  {#if feedback}<p class:fail={!feedback.ok}>{feedback.msg}</p>{/if}
  <div class="hint">
    <button on:click={(e) => locate(e)} disabled={locating}><Icon name="plus" size={14} /> {locating ? 'กำลังค้นหา…' : 'ใช้ตำแหน่งปัจจุบัน'}</button>
    <span>หรือแตะบนแผนที่</span>
  </div>
</div>

<style>
  .loc { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; gap: 6px; }
  input { flex: 1; min-width: 0; padding: 9px 12px; border: 1px solid var(--line); border-radius: var(--r-xs); background: var(--paper-2); color: var(--ink); font: inherit; font-size: var(--fs-sm); }
  input:focus { outline: none; border-color: var(--pri); box-shadow: var(--ring); }
  .mini:active, .hint button:active { transform: scale(.92); }
  .mini { width: 38px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: var(--r-xs); background: var(--paper-2); color: var(--ink-2); cursor: pointer; }
  p { margin: 0; font-size: var(--fs-xs); color: var(--pri); }
  p.fail { color: #b33; }
  .hint { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: var(--fs-xs); color: var(--ink-3); }
  .hint button { display: inline-flex; align-items: center; gap: 5px; border: none; background: none; color: var(--pri); font-weight: 700; font-size: var(--fs-xs); cursor: pointer; }
  .hint button:disabled { opacity: .5; }
</style>
