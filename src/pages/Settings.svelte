<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowsClockwise, Check, DownloadSimple, LockKey, Monitor, Moon, Rows, SignOut, Sun } from 'phosphor-svelte'
  import SyncStatus from '@/components/SyncStatus.svelte'
  import { createPwaInstall } from '@/lib/create-pwa-install.svelte'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { manuallyUpdateApp, getRememberedRegistration } from '@/lib/pwa-update'
  import { treatyClient, treatyHeaders } from '@/lib/treaty'
  import { formatDateTime } from '@/lib/utils'
  import { useFilterStore } from '@/stores/filter-store'
  import { getTheme, DESIGN_PALETTES } from '@/lib/design/themes'
  import { appTheme, setMode, setPalette, setDensity, setTexture, themeSupportsMode } from '@/lib/app-theme'

  let isAdmin = $derived($useAuthStore.isAdmin)
  let isSignedIn = $derived($useAuthStore.isSignedIn)
  let setLoginOpen = $derived($useAuthStore.setLoginOpen)
  let theme = $derived($appTheme)
  let recentDays = $derived($useFilterStore.recentDays)
  let selectedTheme = $derived(getTheme(theme.themeId))
  let density = $derived(theme.density)
  let texture = $derived(theme.texture)

  const pwa = createPwaInstall()
  onMount(() => pwa.init())

  let tab = $state<'look' | 'data' | 'log' | 'account'>('look')

  interface AuditRow { id: string; action: string; target: string | null; payload: Record<string, unknown> | null; createdAt: number }
  let audit = $state<AuditRow[]>([])
  let auditState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const AUDIT_LABELS: Record<string, { tag: string; label: string; tone: 'p' | 'a' | 'd' }> = {
    'client.create': { tag: '+', label: 'เพิ่มระเบียน', tone: 'p' },
    'client.update': { tag: 'ED', label: 'แก้ไขระเบียน', tone: 'a' },
    'client.delete': { tag: 'DEL', label: 'ย้ายไปถังขยะ', tone: 'd' },
    'client.restore': { tag: 'RST', label: 'กู้คืนระเบียน', tone: 'p' },
    'client.force_delete': { tag: 'DEL', label: 'ลบถาวร', tone: 'd' },
    'profile.theme.update': { tag: 'TH', label: 'เปลี่ยนธีม', tone: 'a' },
  }
  const TONE: Record<'p' | 'a' | 'd', string> = {
    p: 'bg-acc-tint text-acc-ink',
    a: 'bg-pop-tint text-pop-ink',
    d: 'bg-danger-tint text-danger-ink',
  }

  async function loadAudit() {
    auditState = 'loading'
    try {
      const { data, error } = await treatyClient.api.audit.get({ headers: await treatyHeaders() })
      if (error || !Array.isArray(data)) throw new Error('audit')
      audit = data as unknown as AuditRow[]
      auditState = 'ready'
    } catch {
      auditState = 'error'
    }
  }

  $effect(() => {
    if (tab === 'log' && isAdmin && auditState === 'idle') void loadAudit()
  })

  let appUpdateState = $state<'idle' | 'checking' | 'latest' | 'error'>('idle')
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  const modeItems = ['light', 'dark', 'auto'] as const

  const finishUpdateCheck = (next: 'latest' | 'error') => {
    appUpdateState = next
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (appUpdateState = 'idle'), 2200)
  }

  const checkForAppUpdate = async () => {
    appUpdateState = 'checking'
    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    try {
      const result = await Promise.race([manuallyUpdateApp(getRememberedRegistration()), timeout(10000)])
      if (result === 'latest') finishUpdateCheck('latest')
    } catch {
      finishUpdateCheck('error')
    }
  }
</script>

<section class="settings-page page-shell page-shell--settings">
  <header class="settings-head">
    <div><span class="eyebrow">DATA LEDGER · PREFERENCES</span><h1>ตั้งค่า</h1><p>ปรับรูปลักษณ์ ข้อมูล และการทำงานของแอป</p></div>
    <span class="settings-version">DATA Ledger</span>
  </header>

  <section class="settings-section">
    <div class="section-heading"><span class="section-index">01</span><div><h2>พาสเทล &amp; ธีม</h2><p>เลือกสีและโหมดที่ใช้งานสบายตา</p></div></div>
    <div id="settings-panel" class="settings-grid">
      <section class="settings-block palette-block">
        <h3 class="label">ชุดสี</h3>
        <div class="palette-grid" role="radiogroup" aria-label="เลือกชุดสี">
          {#each DESIGN_PALETTES as p, i}
            {@const active = theme.palette === p.key}
            <button type="button" role="radio" aria-checked={active} onclick={() => setPalette(p.key)} class="palette-choice {active ? 'active' : ''}" style="--tilt:{i % 2 ? .4 : -.4}deg">
              {#if active}<span class="palette-check"><Check size={12} weight="bold" /></span>{/if}
              <span class="palette-swatches"><i style="background:{p.acc}"></i><i style="background:{p.pop}"></i><i style="background:{p.tint}"></i></span>
              <b>{p.name}</b><small>{p.key}</small>
            </button>
          {/each}
        </div>
      </section>
      <section class="settings-block">
        <h3 class="label">โหมดการแสดงผล</h3>
        <div class="seg mode-seg" role="group" aria-label="เลือกโหมดสี">
          {#each modeItems as item}
            {@const label = item === 'auto' ? 'ตามระบบ' : item === 'light' ? 'สว่าง' : 'มืด'}
            {@const supported = themeSupportsMode(selectedTheme, item)}
            {@const active = theme.mode === item || (theme.mode === 'auto' && selectedTheme.modes?.length === 1 && selectedTheme.modes[0] === item)}
            <button type="button" class="seg-item" aria-pressed={active} onclick={() => setMode(item)} disabled={!supported}>
              {#if item === 'auto'}<Monitor size={14} aria-hidden="true" />{:else if item === 'light'}<Sun size={14} aria-hidden="true" />{:else}<Moon size={14} aria-hidden="true" />{/if}{label}
            </button>
          {/each}
        </div>
        <p class="settings-hint">{selectedTheme.label} — {selectedTheme.description}</p>
      </section>
      <section class="settings-block">
        <div class="setting-line"><div><h3>กระดาษจุด</h3><p>ลายพื้นหลังแบบกระดาษในต้นแบบ</p></div><button type="button" role="switch" aria-checked={texture} aria-label="สลับกระดาษจุด" onclick={() => setTexture(!texture)} class="switch-control relative h-7 w-12 shrink-0 rounded-full border border-rule-2 transition-colors {texture ? 'bg-pri-fill' : 'bg-paper-3'}"><span class="absolute top-[2.5px] size-[18px] rounded-full bg-card shadow transition-all duration-200 {texture ? 'left-[24px]' : 'left-[3px]'}"></span></button></div>
      </section>
      <section class="settings-block">
        <div class="setting-line"><div><h3>ความหนาแน่นแถว</h3><p>กำหนดระยะห่างในรายการลูกค้า</p></div><div class="seg" role="radiogroup" aria-label="ความหนาแน่นแถว"><button type="button" role="radio" aria-checked={density === 'cozy'} onclick={() => setDensity('cozy')} class="seg-item"><Rows size={13} aria-hidden="true" /> สบายตา</button><button type="button" role="radio" aria-checked={density === 'compact'} onclick={() => setDensity('compact')} class="seg-item">กระชับ</button></div></div>
      </section>
    </div>
  </section>

  <section class="settings-section">
    <div class="section-heading"><span class="section-index">02</span><div><h2>ข้อมูลและซิงก์</h2><p>ตั้งค่าตัวกรองและตรวจสถานะข้อมูล</p></div></div>
    <div class="settings-grid">
      <section class="settings-block"><div class="setting-line"><div><h3>ช่วง “ล่าสุด”</h3><p>จำนวนวันที่ใช้กับตัวกรองล่าสุด</p></div><span class="chip border-rule bg-tint font-mono text-acc-ink">{recentDays} วัน</span></div><input id="recent-days" type="range" min="7" max="120" step="1" value={recentDays} oninput={(e) => $useFilterStore.setRecentDays(Number(e.currentTarget.value))} class="range-input" /><div class="range-labels"><span>7 วัน</span><span>120 วัน</span></div></section>
      <section class="settings-block"><h3 class="label">การซิงก์ข้อมูล</h3><SyncStatus /></section>
    </div>
  </section>

  <section class="settings-section">
    <div class="section-heading"><span class="section-index">03</span><div><h2>บันทึกกิจกรรม</h2><p>ติดตามการเปลี่ยนแปลงข้อมูลโดยผู้ดูแล</p></div></div>
    <section class="settings-block audit-block">
      {#if !isAdmin}<p class="muted-message">เฉพาะผู้ดูแลเท่านั้น</p>
      {:else if auditState === 'loading' || auditState === 'idle'}<p class="muted-message" role="status">กำลังโหลดบันทึกกิจกรรม…</p>
      {:else if auditState === 'error'}<div class="muted-message" role="alert"><p class="font-semibold text-danger-ink">โหลดบันทึกกิจกรรมไม่สำเร็จ</p><button type="button" onclick={() => void loadAudit()} class="btn btn-pop mt-3">ลองใหม่</button></div>
      {:else if audit.length === 0}<p class="muted-message">ยังไม่มีกิจกรรม</p>
      {:else}<div>{#each audit as e (e.id)}{@const meta = AUDIT_LABELS[e.action] ?? { tag: '·', label: e.action, tone: 'a' as const }}<div class="audit-row"><span aria-hidden="true" class="chip audit-tag {TONE[meta.tone]}">{meta.tag}</span><span class="audit-description"><b>{meta.label}{#if typeof e.payload?.name === 'string' && e.payload.name} · {e.payload.name}{/if}</b><small>{e.target ?? '—'}</small></span><time>{formatDateTime(e.createdAt)}</time></div>{/each}</div>{/if}
    </section>
  </section>

  <section class="settings-section">
    <div class="section-heading"><span class="section-index">04</span><div><h2>แอปและบัญชี</h2><p>อัปเดตแอปและจัดการการเข้าสู่ระบบ</p></div></div>
    <section class="settings-block account-block">
      <button type="button" onclick={() => (pwa.isIOS ? undefined : (pwa.canInstall ? void pwa.install() : undefined))}><DownloadSimple size={18} /> ติดตั้งแอป {#if pwa.isIOS}<small>ใช้เมนู Share ใน Safari</small>{:else if !pwa.canInstall}<small>เปิดใน Chrome/Edge เพื่อติดตั้ง</small>{/if}</button>
      <button type="button" onclick={() => void checkForAppUpdate()} disabled={appUpdateState === 'checking'}><ArrowsClockwise size={18} class={appUpdateState === 'checking' ? 'spin' : ''} />{appUpdateState === 'checking' ? 'กำลังตรวจหาอัปเดต…' : 'ตรวจหาอัปเดตแอป'}{#if appUpdateState === 'latest'}<small>เป็นเวอร์ชันล่าสุด</small>{/if}{#if appUpdateState === 'error'}<small class="danger-note">ตรวจสอบไม่สำเร็จ</small>{/if}</button>
      {#if isSignedIn}<button type="button" class="danger-action" onclick={() => void logout()}><SignOut size={18} /> ออกจากระบบ</button>{:else}<button type="button" onclick={() => setLoginOpen(true)}><LockKey size={18} /> เข้าสู่ระบบ</button>{/if}
    </section>
  </section>
</section>
<style>
  .settings-page { max-width:var(--maxw); padding-top:30px; padding-bottom:64px; }
  .settings-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding-bottom:22px; border-bottom:2px solid var(--rule-2); }
  .settings-head h1 { margin-top:5px; font-size:var(--fs-2xl); }
  .settings-head p,.section-heading p,.settings-hint,.setting-line p { margin-top:4px; color:var(--ink-faint); font-size:var(--fs-sm); }
  .eyebrow,.settings-version { color:var(--pri); font-size:var(--fs-2xs); font-weight:700; letter-spacing:.12em; }
  .settings-version { padding:5px 9px; border:1px solid var(--rule); border-radius:var(--r-pill); color:var(--ink-soft); letter-spacing:.04em; }
  .settings-section { display:grid; grid-template-columns:minmax(180px,.7fr) minmax(0,1.8fr); gap:24px; padding:25px 0; border-bottom:1px solid var(--rule); }
  .section-heading { display:flex; align-items:flex-start; gap:12px; }
  .section-index { display:grid; place-items:center; width:30px; height:30px; flex:none; border-radius:50%; background:var(--pri-fill); color:var(--pri-ink); font:700 11px var(--font-mono); }
  .section-heading h2 { font-family:var(--font-display); font-size:var(--fs-lg); }
  .settings-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .settings-block { min-width:0; padding:16px; border:1px solid var(--rule); border-radius:var(--r-md); background:var(--card); }
  .settings-block h3 { color:var(--ink); font-size:var(--fs-sm); font-weight:700; }
  .palette-block { grid-column:1/-1; }
  .palette-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:12px; }
  .palette-choice { position:relative; display:flex; flex-direction:column; gap:6px; min-width:0; padding:12px; transform:rotate(var(--tilt)); border:1px solid var(--rule); border-radius:var(--r-md); background:var(--paper-2); text-align:left; }
  .palette-choice.active { border-color:var(--pri); box-shadow:var(--sh-sm); }
  .palette-swatches { display:flex; gap:5px; }.palette-swatches i { width:18px;height:18px;border:1px solid color-mix(in srgb,var(--ink) 14%,transparent);border-radius:50%; }
  .palette-choice b { font-size:var(--fs-sm); }.palette-choice small { color:var(--ink-faint);font:10px var(--font-mono); }
  .palette-check { position:absolute; top:7px; right:7px; display:grid; place-items:center; width:21px;height:21px;border:1px solid var(--pri);border-radius:50%;background:var(--pri-fill);color:var(--pri-ink); }
  .mode-seg { display:flex; width:100%; margin-top:10px; }.mode-seg .seg-item { display:flex;flex:1;align-items:center;justify-content:center;gap:6px; }
  .settings-hint { line-height:1.5; }
  .setting-line { display:flex;align-items:center;justify-content:space-between;gap:12px; }.setting-line > div { min-width:0; }
  .range-input { width:100%; margin-top:16px;accent-color:var(--pri); }.range-labels { display:flex;justify-content:space-between;color:var(--ink-faint);font:10px var(--font-mono); }
  .audit-row { display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--rule); }.audit-row:last-child { border-bottom:0; }
  .audit-tag { width:29px;height:29px; }.audit-description { min-width:0; }.audit-description b,.audit-description small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.audit-description b { font-size:var(--fs-sm); }.audit-description small,.audit-row time { color:var(--ink-faint);font:11px var(--font-mono); }.muted-message { padding:24px;text-align:center;color:var(--ink-soft);font-size:var(--fs-sm); }
  .account-block { padding:5px 14px; }.account-block button { display:flex;align-items:center;gap:11px;width:100%;min-height:46px;padding:8px 4px;border:0;border-bottom:1px solid var(--rule);background:transparent;color:var(--ink);text-align:left;font-size:var(--fs-sm); }.account-block button:last-child { border-bottom:0; }.account-block button small { margin-left:auto;color:var(--ink-faint);font-size:var(--fs-2xs); }.account-block .danger-action,.danger-note { color:var(--danger-ink); }
  @media(max-width:760px) { .settings-page { padding-top:22px; }.settings-section { grid-template-columns:minmax(0,1fr); gap:14px; }.palette-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media(max-width:460px) { .settings-head { align-items:flex-start; }.settings-version { display:none; }.settings-grid { grid-template-columns:minmax(0,1fr); }.palette-block { grid-column:auto; }.setting-line { align-items:flex-start; flex-direction:column; } }
</style>
