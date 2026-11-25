<script>
  import { onMount } from 'svelte';
  import { palette, theme, PALETTES, setPalette, setTheme } from '../lib/theme.js';
  import { settings, update, resetSettings, FONTS, ELEV_STEPS } from '../lib/settings.js';
  import { boom, toast } from '../lib/effects.js';
  import { copyText } from '../lib/format.js';

  import Button from '../components/Button.svelte';
  import Chip from '../components/Chip.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Toggle from '../components/Toggle.svelte';
  import Rating from '../components/Rating.svelte';
  import Progress from '../components/Progress.svelte';
  import Badge from '../components/Badge.svelte';
  import SearchInput from '../components/SearchInput.svelte';
  import Monogram from '../components/Monogram.svelte';
  import Slider from '../components/Slider.svelte';
  import Asterisk from '../components/Asterisk.svelte';
  import Icon from '../components/Icon.svelte';

  const COLOR_TOKENS = [
    { n: '--paper', label: 'Paper' }, { n: '--paper-2', label: 'Surface' }, { n: '--paper-3', label: 'Sunken' },
    { n: '--ink', label: 'Ink' }, { n: '--ink-2', label: 'Ink · 2' }, { n: '--ink-3', label: 'Ink · 3' },
    { n: '--line', label: 'Line' }, { n: '--line-2', label: 'Line · 2' },
    { n: '--pri', label: 'Primary' }, { n: '--pri-fill', label: 'Pri · fill' }, { n: '--pri-soft', label: 'Pri · soft' }, { n: '--pri-ink', label: 'On fill' },
    { n: '--acc', label: 'Accent' }, { n: '--acc-fill', label: 'Acc · fill' }, { n: '--acc-soft', label: 'Acc · soft' }, { n: '--sec', label: 'Secondary' }
  ];

  let vals = {};
  function readVals() {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (const t of COLOR_TOKENS) out[t.n] = cs.getPropertyValue(t.n).trim();
    vals = out;
  }
  onMount(readVals);
  $: { $palette; $theme; $settings; if (typeof document !== 'undefined') readVals(); }

  let seg = 'one';
  let toggled = true;
  let rating = 4;
  let demoSearch = '';

  $: elevName = ELEV_STEPS[$settings.elev] ?? 'ปกติ';
  $: radiusScale = (0.4 + ($settings.radius / 100) * 1.2).toFixed(2);

  function pickPalette(id, e) {
    setPalette(id);
    const r = e.currentTarget.getBoundingClientRect();
    boom(r.left + r.width / 2, r.top + r.height / 2, { tone: 'pri', size: 46 });
    toast('เปลี่ยนพาสเทลเป็น ' + (PALETTES.find(p => p.id === id)?.label || id), { tone: 'pri' });
  }
  function pickTheme(t, e) {
    setTheme(t);
    const r = e.currentTarget.getBoundingClientRect();
    boom(r.left + r.width / 2, r.top + r.height / 2, { tone: 'acc', size: 40 });
  }
  function burstDemo(e) {
    const r = e.currentTarget.getBoundingClientRect();
    boom(r.left + r.width / 2, r.top + r.height / 2, { tone: 'acc', size: 70, n: 12 });
  }
  function doReset() {
    resetSettings();
    toast('คืนค่าเริ่มต้นแล้ว', { tone: 'ok', icon: 'check' });
  }
  async function copyTokens() {
    const ok = await copyText(':root{\n  --pri: ' + (vals['--pri'] || '') + ';\n  --pri-fill: ' + (vals['--pri-fill'] || '') + ';\n  --acc: ' + (vals['--acc'] || '') + ';\n  --elev: ' + ($settings.elev / 2) + ';\n  --r-scale: ' + radiusScale + ';\n}');
    toast(ok ? 'คัดลอกโทเค็นแล้ว' : 'คัดลอกไม่สำเร็จ', { tone: ok ? 'ok' : 'warn', icon: ok ? 'check' : 'info' });
  }

  $: code = `/* ค่าที่ปรับจากหน้านี้ (persist ไว้ใน localStorage) */
:root{
  --elev: ${($settings.elev / 2).toFixed(2)};      /* เงา: 0 = แบน … 2 = ฟู */
  --r-scale: ${radiusScale};   /* ขอบโค้ง × */
  --pri-fill: ${vals['--pri-fill'] || '…'};  /* พื้นพาสเทล */
  --pri: ${vals['--pri'] || '…'};        /* โทนตัวอักษร */
}`;
</script>

<section class="wrap page">
  <header class="head">
    <div class="head-left">
      <span class="eyebrow"><Asterisk size={13} color="var(--pri)" /> Settings</span>
      <h1>ตั้งค่า</h1>
    </div>
    <div class="head-actions">
      <Button variant="ghost" size="sm" icon="edit" on:click={doReset}>คืนค่าเริ่มต้น</Button>
      <Button variant="soft" size="sm" icon="copy" on:click={copyTokens}>คัดลอกโทเค็น</Button>
    </div>
  </header>

  <!-- Palette + theme -->
  <section class="block">
    <h2 class="block-title">พาสเทล &amp; ธีม</h2>
    <div class="pal-grid">
      {#each PALETTES as p}
        <button class="pal-card {p.id === $palette ? 'on' : ''}" on:click={(e) => pickPalette(p.id, e)}>
          <span class="pal-swatches">
            <i style="background:hsl({p.hue} 62% 80%)"></i>
            <i style="background:hsl({p.hue + 70} 70% 86%)"></i>
            <i style="background:hsl({p.hue - 90} 55% 74%)"></i>
          </span>
          <span class="pal-name">{p.label}</span>
          {#if p.id === $palette}<span class="pal-check"><Icon name="check" size={12} /></span>{/if}
        </button>
      {/each}
    </div>
    <div class="theme-row">
      <span class="label">โหมด</span>
      <Segmented options={[{ id: 'light', label: 'สว่าง' }, { id: 'dark', label: 'มืด' }]} value={$theme} on:change={(e) => pickTheme(e.detail)} />
    </div>
  </section>

  <!-- Look controls + live preview (symmetric split) -->
  <section class="block">
    <h2 class="block-title">รูปลักษณ์</h2>
    <div class="split">
      <div class="controls">
        <Slider
          label="Card elevation"
          display="{elevName} · {$settings.elev}"
          hint="ระดับเงาของการ์ด ปุ่ม และแผ่นลอย"
          min={0} max={4} step={1} value={$settings.elev}
          on:input={(e) => update({ elev: e.detail })}
        />
        <Slider
          label="ขอบโค้ง"
          display="{radiusScale}×"
          hint="ขยาย/ย่อ มุมทุกชิ้นพร้อมกัน"
          min={0} max={100} step={1} value={$settings.radius}
          on:input={(e) => update({ radius: e.detail })}
        />
        <div class="ctl-row">
          <span class="ctl-label">พื้นกระดาษ (จุด)</span>
          <Toggle checked={$settings.texture} on:change={(e) => update({ texture: e.detail })} />
        </div>
      </div>

      <div class="preview">
        <span class="pv-label">ตัวอย่างสด</span>
        <div class="pv-card">
          <div class="pv-top">
            <Monogram name="ลาบ ก้อย" size={38} />
            <div class="pv-who">
              <b>ลาบ ก้อย สโมสร</b>
              <small class="dim">ศักดิ์ชาย บุญชาญ</small>
            </div>
            <Badge tone="pri" icon="bolt" size="sm">จ่ายในวัน</Badge>
          </div>
          <div class="pv-actions">
            <Button size="sm">เปิด</Button>
            <Button size="sm" variant="soft">คัดลอก</Button>
            <Button size="sm" variant="outline">แก้ไข</Button>
          </div>
        </div>
        <div class="pv-radii">
          {#each ['--r-xs', '--r-sm', '--r-md', '--r-lg', '--r-xl'] as r}
            <span class="pv-radius" style="border-radius:var({r})" title={r}></span>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Font -->
  <section class="block">
    <h2 class="block-title">ฟอนต์</h2>
    <div class="font-grid">
      {#each FONTS as f}
        <button class="font-card {$settings.font === f.id ? 'on' : ''}" on:click={() => update({ font: f.id })}>
          <span class="fv" style="font-family:{f.stack}">สวัสดี Aa กขค 0123</span>
          <span class="fm"><b>{f.label}</b><small class="dim">{f.note}</small></span>
          {#if $settings.font === f.id}<span class="pal-check"><Icon name="check" size={12} /></span>{/if}
        </button>
      {/each}
    </div>
    <p class="dim" style="font-size:var(--fs-2xs); margin-top:8px">
      ฟอนต์ “โมจิ” (Crafty Font · all rights reserved) ใส่ไฟล์เองได้ที่ <code>public/fonts/Moji-Regular.ttf</code>
    </p>
  </section>

  <!-- Color tokens -->
  <section class="block">
    <h2 class="block-title">Color tokens</h2>
    <div class="tok-grid">
      {#each COLOR_TOKENS as t}
        <div class="tok">
          <span class="tok-sw" style="background:{vals[t.n] || 'var(' + t.n + ')'}"></span>
          <span class="tok-meta">
            <b>{t.label}</b>
            <code>{t.n}</code>
          </span>
        </div>
      {/each}
    </div>
  </section>

  <!-- Components -->
  <section class="block">
    <h2 class="block-title">Components</h2>
    <div class="gal">
      <div class="g-cell">
        <h3>Button</h3>
        <div class="row gap wrap">
          <Button>Solid</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button tone="acc" size="sm">Accent</Button>
        </div>
      </div>

      <div class="g-cell">
        <h3>Chip</h3>
        <div class="row gap wrap">
          <Chip active={true} count={512}>มีรูป</Chip>
          <Chip count={30}>มีโน้ต</Chip>
          <Chip count={84}>จ่ายในวัน</Chip>
        </div>
      </div>

      <div class="g-cell">
        <h3>Segmented</h3>
        <Segmented options={[{ id: 'one', label: 'ล่าสุด' }, { id: 'two', label: 'ชื่อ' }, { id: 'three', label: 'มีรูป' }]} bind:value={seg} />
      </div>

      <div class="g-cell">
        <h3>Toggle / Rating</h3>
        <div class="row gap">
          <Toggle bind:checked={toggled} />
          <Rating bind:value={rating} />
        </div>
      </div>

      <div class="g-cell">
        <h3>Progress</h3>
        <Progress value={72} />
      </div>

      <div class="g-cell">
        <h3>Badge</h3>
        <div class="row gap wrap">
          <Badge tone="pri" icon="bolt" size="sm">จ่ายในวัน</Badge>
          <Badge tone="ok" icon="check" size="sm">โอเค</Badge>
          <Badge tone="info" icon="info" size="sm">บัตรเครดิต</Badge>
          <Badge tone="warn" icon="bolt" size="sm">ด่วน</Badge>
        </div>
      </div>

      <div class="g-cell">
        <h3>Search</h3>
        <SearchInput bind:value={demoSearch} placeholder="ค้นหา…" hint={['⌘', 'K']} />
      </div>

      <div class="g-cell">
        <h3>Motion</h3>
        <div class="row gap">
          <Button size="sm" on:click={burstDemo}>Impact Burst</Button>
          <Button size="sm" variant="outline" on:click={() => toast('นี่คือโทสต์ตัวอย่าง', { tone: 'ok', icon: 'check' })}>Toast</Button>
        </div>
      </div>
    </div>
  </section>

  <!-- Code -->
  <section class="block">
    <h2 class="block-title">Token snippet</h2>
    <pre class="code">{code}</pre>
  </section>
</section>

<style>
  .page { padding-top: 22px; padding-bottom: 60px; }

  .head {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; padding-bottom: 16px; border-bottom: 2px solid var(--line-2);
  }
  .head-actions { display: flex; gap: 8px; }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: var(--fs-xs); font-weight: 700; color: var(--pri);
    text-transform: uppercase; letter-spacing: .08em;
  }
  .head h1 { font-family: var(--font-display); font-size: var(--fs-2xl); font-weight: 700; margin-top: 4px; }

  .block { margin-top: 26px; }
  .block-title {
    font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700;
    margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
  }
  .block-title::before { content: ''; width: 6px; height: 16px; border-radius: 3px; background: var(--pri); }

  /* palette — 4 equal columns */
  .pal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media (max-width: 640px) { .pal-grid { grid-template-columns: repeat(2, 1fr); } }
  .pal-card {
    position: relative; display: flex; flex-direction: column; gap: 8px;
    padding: 10px; border-radius: var(--r-sm); border: 1.5px solid var(--line);
    background: var(--paper-2); text-align: left;
    transition: transform var(--dur) var(--ease-spring), border-color var(--dur) var(--ease-out);
  }
  .pal-card:hover { transform: translateY(-2px); }
  .pal-card.on { border-color: var(--pri); box-shadow: 0 0 0 2px var(--pri-soft); }
  .pal-swatches { display: flex; gap: 4px; }
  .pal-swatches i { flex: 1; height: 26px; border-radius: 6px; }
  .pal-name { font-size: var(--fs-sm); font-weight: 600; }
  .pal-check {
    position: absolute; top: 8px; right: 8px; width: 18px; height: 18px;
    display: grid; place-items: center; border-radius: 50%;
    background: var(--pri); color: var(--paper-2);
  }

  .theme-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
  .theme-row .label { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); }

  /* controls + live preview — symmetric split */
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 760px) { .split { grid-template-columns: 1fr; } }
  .controls { display: flex; flex-direction: column; gap: 18px; justify-content: center; }
  .ctl-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 12px 14px;
    background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--r-sm);
  }
  .ctl-label { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); }

  .preview {
    display: flex; flex-direction: column; gap: 10px;
    padding: 16px; background: var(--paper-3);
    border: 1px solid var(--line); border-radius: var(--r-md);
  }
  .pv-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); }
  .pv-card {
    background: var(--paper-2); border: 1px solid var(--line);
    border-radius: var(--r-md); box-shadow: var(--shadow-pop);
    padding: 14px; display: flex; flex-direction: column; gap: 12px;
  }
  .pv-top { display: flex; align-items: center; gap: 10px; }
  .pv-who { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .pv-who b { font-size: var(--fs-md); }
  .pv-who small { font-size: var(--fs-xs); }
  .pv-actions { display: flex; gap: 8px; }
  .pv-radii { display: flex; gap: 8px; }
  .pv-radius {
    flex: 1; height: 34px; background: var(--pri-soft);
    border: 2px solid var(--pri);
  }

  /* font picker */
  .font-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media (max-width: 860px) { .font-grid { grid-template-columns: repeat(2, 1fr); } }
  .font-card {
    position: relative; display: flex; flex-direction: column; gap: 8px;
    padding: 12px; border-radius: var(--r-sm); border: 1.5px solid var(--line);
    background: var(--paper-2); text-align: left;
    transition: transform var(--dur) var(--ease-spring), border-color var(--dur) var(--ease-out);
  }
  .font-card:hover { transform: translateY(-2px); }
  .font-card.on { border-color: var(--pri); box-shadow: 0 0 0 2px var(--pri-soft); }
  .fv { font-size: var(--fs-lg); color: var(--ink); line-height: 1.3; }
  .fm { display: flex; flex-direction: column; gap: 1px; }
  .fm b { font-size: var(--fs-sm); }
  .fm small { font-size: 10px; }

  /* color tokens — 4-col grid */
  .tok-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  @media (max-width: 900px) { .tok-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 640px) { .tok-grid { grid-template-columns: repeat(2, 1fr); } }
  .tok {
    display: flex; align-items: center; gap: 10px; padding: 8px;
    border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--paper-2);
  }
  .tok-sw { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--line); flex: none; }
  .tok-meta { display: flex; flex-direction: column; min-width: 0; }
  .tok-meta b { font-size: var(--fs-xs); font-weight: 600; }
  .tok-meta code { font-size: 10px; color: var(--pri); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .row.gap { gap: 10px; }

  /* gallery — 2-col symmetric */
  .gal { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media (max-width: 720px) { .gal { grid-template-columns: 1fr; } }
  .g-cell { border: 1px solid var(--line); border-radius: var(--r-sm); padding: 14px; background: var(--paper-2); }
  .g-cell h3 { font-size: 10px; color: var(--ink-3); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 10px; font-weight: 700; }

  .code {
    background: var(--paper-3); border: 1px solid var(--line); border-radius: var(--r-sm);
    padding: 14px 16px; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: var(--fs-xs); color: var(--ink-2); overflow-x: auto; line-height: 1.7; margin: 0;
  }
</style>
