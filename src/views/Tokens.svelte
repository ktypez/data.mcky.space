<script>
  import { onMount } from 'svelte';
  import { settings } from '../lib/settings.js';
  import { theme } from '../lib/theme.js';
  import { copyText } from '../lib/format.js';
  import { toast, burstAt } from '../lib/effects.js';
  import { setView } from '../lib/ui.js';
  import Button from '../components/Button.svelte';
  import Chip from '../components/Chip.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Toggle from '../components/Toggle.svelte';
  import Rating from '../components/Rating.svelte';
  import Progress from '../components/Progress.svelte';
  import Badge from '../components/Badge.svelte';
  import SearchInput from '../components/SearchInput.svelte';
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
  $: { $theme; $settings; if (typeof document !== 'undefined') readVals(); }

  let seg = 'one';
  let toggled = true;
  let rating = 4;
  let demoSearch = '';
  function burstDemo(e) {
    burstAt(e, { tone: 'acc', size: 70, n: 12 });
  }
  async function copyTokens() {
    const ok = await copyText(':root{\n  --pri: ' + (vals['--pri'] || '') + ';\n  --pri-fill: ' + (vals['--pri-fill'] || '') + ';\n  --acc: ' + (vals['--acc'] || '') + ';\n  --elev: ' + ($settings.elev / 2) + ';\n  --r-scale: ' + (0.4 + ($settings.radius / 100) * 1.2).toFixed(2) + ';\n}');
    toast(ok ? 'คัดลอกโทเค็นแล้ว' : 'คัดลอกไม่สำเร็จ', { tone: ok ? 'ok' : 'warn', icon: ok ? 'check' : 'info' });
  }
  $: code = `/* design tokens */\n:root{\n  --elev: ${($settings.elev / 2).toFixed(2)};\n  --r-scale: ${(0.4 + ($settings.radius / 100) * 1.2).toFixed(2)};\n  --pri: ${vals['--pri'] || '…'};\n  --acc: ${vals['--acc'] || '…'};\n}`;
</script>

<section class="wrap page">
  <header class="head">
    <div class="head-left">
      <span class="eyebrow"><Asterisk size={13} color="var(--pri)" /> Hidden</span>
      <h1>Design tokens</h1>
    </div>
    <div class="head-actions">
      <Button variant="ghost" size="sm" on:click={() => setView('settings')}>กลับตั้งค่า</Button>
      <Button variant="soft" size="sm" icon="copy" on:click={copyTokens}>คัดลอกโทเค็น</Button>
    </div>
  </header>

  <section class="block">
    <h2 class="block-title">Color tokens</h2>
    <div class="tok-grid">
      {#each COLOR_TOKENS as t}
        <div class="tok">
          <span class="tok-sw" style="background:{vals[t.n] || 'var(' + t.n + ')'}"></span>
          <span class="tok-meta"><b>{t.label}</b><code>{t.n}</code></span>
        </div>
      {/each}
    </div>
  </section>

  <section class="block">
    <h2 class="block-title">Components</h2>
    <div class="gal">
      <div class="g-cell"><h3>Button</h3><div class="row gap wrap"><Button>Solid</Button><Button variant="soft">Soft</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button><Button tone="acc" size="sm">Accent</Button></div></div>
      <div class="g-cell"><h3>Chip</h3><div class="row gap wrap"><Chip active={true} count={512}>มีรูป</Chip><Chip count={30}>มีโน้ต</Chip><Chip count={84}>วางบิล</Chip></div></div>
      <div class="g-cell"><h3>Segmented</h3><Segmented options={[{ id: 'one', label: 'ล่าสุด' }, { id: 'two', label: 'ชื่อ' }, { id: 'three', label: 'มีรูป' }]} bind:value={seg} /></div>
      <div class="g-cell"><h3>Toggle / Rating</h3><div class="row gap"><Toggle bind:checked={toggled} /><Rating bind:value={rating} /></div></div>
      <div class="g-cell"><h3>Progress</h3><Progress value={72} /></div>
      <div class="g-cell"><h3>Badge</h3><div class="row gap wrap"><Badge tone="pri" icon="bolt" size="sm">วางบิล</Badge><Badge tone="ok" icon="check" size="sm">โอเค</Badge><Badge tone="info" icon="info" size="sm">บัตรเครดิต</Badge><Badge tone="warn" icon="bolt" size="sm">ด่วน</Badge></div></div>
      <div class="g-cell"><h3>Search</h3><SearchInput bind:value={demoSearch} placeholder="ค้นหา…" hint={['⌘', 'K']} /></div>
      <div class="g-cell"><h3>Motion</h3><div class="row gap"><Button size="sm" on:click={burstDemo}>Impact Burst</Button><Button size="sm" variant="outline" on:click={() => toast('นี่คือโทสต์ตัวอย่าง', { tone: 'ok', icon: 'check' })}>Toast</Button></div></div>
    </div>
  </section>

  <section class="block">
    <h2 class="block-title">Token snippet</h2>
    <pre class="code">{code}</pre>
  </section>
</section>

<style>
  .page { padding-top: 22px; padding-bottom: 60px; }
  .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid var(--line-2); }
  .head-actions { display: flex; gap: 8px; }
  .eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); font-weight: 700; color: var(--pri); text-transform: uppercase; letter-spacing: .08em; }
  .head h1 { font-family: var(--font-display); font-size: var(--fs-2xl); font-weight: 700; margin-top: 4px; }
  .block { margin-top: 26px; }
  .block-title { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .block-title::before { content: ''; width: 6px; height: 16px; border-radius: 3px; background: var(--pri); }
  .tok-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  @media (max-width: 900px) { .tok-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 640px) { .tok-grid { grid-template-columns: repeat(2, 1fr); } }
  .tok { display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--paper-2); }
  .tok-sw { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--line); flex: none; }
  .tok-meta { display: flex; flex-direction: column; min-width: 0; }
  .tok-meta b { font-size: var(--fs-xs); font-weight: 600; }
  .tok-meta code { font-size: 10px; color: var(--pri); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row.gap { gap: 10px; }
  .gal { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media (max-width: 720px) { .gal { grid-template-columns: 1fr; } }
  .g-cell { border: 1px solid var(--line); border-radius: var(--r-sm); padding: 14px; background: var(--paper-2); }
  .g-cell h3 { font-size: 10px; color: var(--ink-3); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 10px; font-weight: 700; }
  .code { background: var(--paper-3); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 14px 16px; font-family: ui-monospace, monospace; font-size: var(--fs-xs); color: var(--ink-2); overflow-x: auto; line-height: 1.7; margin: 0; }
</style>
