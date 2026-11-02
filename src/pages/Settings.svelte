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
  import { getTheme, V5_PALETTES } from '@/lib/design/themes'
  import { appTheme, setMode, setPalette, setDensity, setTexture, themeSupportsMode } from '@/lib/app-theme'
  import CountSticker from '@/components/ui/CountSticker.svelte'
  import Squiggle from '@/components/ui/Squiggle.svelte'

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

  type Tab = 'look' | 'data' | 'log' | 'account'
  const TABS: { key: Tab; label: string }[] = [
    { key: 'look', label: 'ธีมและการแสดงผล' },
    { key: 'data', label: 'ข้อมูลและซิงก์' },
    { key: 'log', label: 'บันทึกกิจกรรม' },
    { key: 'account', label: 'แอปและบัญชี' },
  ]
  let tab = $state<Tab>('look')

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

<section class="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6">
  <div class="flex flex-wrap items-center gap-4">
    <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">ตั้งค่า</h1>
    <CountSticker n="5.0" label="paper pop" rot={2} />
  </div>
  <Squiggle class="mt-2 h-[6px] w-36 text-acc" />
  <p class="mt-2 text-sm text-ink-soft">ปรับลุกสมุดทะเบียน ตรวจข้อมูล และจัดการบัญชี</p>

  <div class="-mx-1 mt-7 overflow-x-auto px-1">
    <div role="tablist" aria-label="หมวดการตั้งค่า" class="seg">
      {#each TABS as t}
        <button type="button" role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls="settings-panel" onclick={() => (tab = t.key)} class="seg-item shrink-0 whitespace-nowrap">{t.label}</button>
      {/each}
    </div>
  </div>

  <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} class="mt-5 min-w-0 space-y-5">
    {#if tab === 'look'}
      <section class="card card-pad">
        <h2 class="label !mb-4">โหมด</h2>
        <div class="seg w-full" role="group" aria-label="เลือกโหมดสี">
          {#each modeItems as item}
            {@const label = item === 'auto' ? 'ตามระบบ' : item === 'light' ? 'สว่าง' : 'มืด'}
            {@const supported = themeSupportsMode(selectedTheme, item)}
            {@const active = theme.mode === item || (theme.mode === 'auto' && selectedTheme.modes?.length === 1 && selectedTheme.modes[0] === item)}
            <button
              type="button"
              class="seg-item flex-1 disabled:cursor-not-allowed disabled:opacity-45"
              aria-pressed={active}
              onclick={() => setMode(item)}
              disabled={!supported}
              aria-label={`ใช้โหมด${label}`}
            >
              {#if item === 'auto'}
                <Monitor size={14} class="mr-1 inline -translate-y-px" aria-hidden="true" />
              {:else if item === 'light'}
                <Sun size={14} class="mr-1 inline -translate-y-px" aria-hidden="true" />
              {:else}
                <Moon size={14} class="mr-1 inline -translate-y-px" aria-hidden="true" />
              {/if}
              {label}
            </button>
          {/each}
        </div>
        <p class="mt-3 text-[12px] leading-relaxed text-ink-faint">ชุดปัจจุบัน: {selectedTheme.label} — {selectedTheme.description}</p>
      </section>

      <section class="card card-pad">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="min-w-0">
            <h2 class="label !mb-0">กระดาษจุด</h2>
            <p class="mt-1.5 text-[12px] text-ink-faint">พื้นหลังลายจุดด้านหลังทุกหน้า</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={texture}
            aria-label="สลับกระดาษจุด"
            onclick={() => setTexture(!texture)}
            class="v5-switch relative h-7 w-12 shrink-0 rounded-full border-[1.5px] border-ink transition-colors {texture ? 'bg-acc' : 'bg-paper-2'}"
          >
            <span class="absolute top-[2.5px] size-[18px] rounded-full bg-white shadow transition-all duration-200 {texture ? 'left-[24px]' : 'left-[3px]'}"></span>
          </button>
        </div>
      </section>

      <section class="card card-pad">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="min-w-0">
            <h2 class="label !mb-0">ความหนาแน่นแถว</h2>
            <p class="mt-1.5 text-[12px] text-ink-faint">ความหายใจของรายการในหน้ารายการ</p>
          </div>
          <div class="seg" role="radiogroup" aria-label="ความหนาแน่นแถว">
            <button type="button" role="radio" aria-checked={density === 'cozy'} onclick={() => setDensity('cozy')} class="seg-item">
              <Rows size={13} class="mr-1 inline -translate-y-px" aria-hidden="true" /> สบายตา
            </button>
            <button type="button" role="radio" aria-checked={density === 'compact'} onclick={() => setDensity('compact')} class="seg-item">กระชับ</button>
          </div>
        </div>
      </section>

      <section class="card card-pad">
        <h2 class="label !mb-4">ชุดสี</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="เลือกชุดสี">
          {#each V5_PALETTES as p, i}
            {@const active = theme.palette === p.key}
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onclick={() => setPalette(p.key)}
              class="relative rounded-2xl border-[1.5px] p-3.5 text-left transition-all duration-150 {active
                ? 'border-ink bg-card shadow-[3px_3px_0_0_var(--acc)]'
                : 'border-rule bg-card hover:border-rule-2'}"
              style="rotate: {i % 2 === 0 ? -1.2 : 1.2}deg;"
            >
              {#if active}
                <span class="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border-[1.5px] border-ink bg-acc text-white">
                  <Check size={12} weight="bold" aria-hidden="true" />
                </span>
              {/if}
              <span class="flex gap-1.5">
                <span class="size-5 rounded-full border border-ink/15" style="background: {p.acc}"></span>
                <span class="size-5 rounded-full border border-ink/15" style="background: {p.pop}"></span>
                <span class="size-5 rounded-full border border-ink/15" style="background: {p.tint}"></span>
              </span>
              <span class="mt-2.5 block text-[13px] font-bold text-ink">{p.name}</span>
              <span class="mono block text-[10.5px] text-ink-faint">{p.acc}</span>
            </button>
          {/each}
        </div>
        <p class="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
          แต่ละชุดสลับ <span class="mono">--acc</span> · <span class="mono">--pop</span> และโทน tints — สีของบัตรเครดิต/จ่ายในวันคงที่ทุกชุด
        </p>
      </section>
    {/if}

    {#if tab === 'data'}
      <section class="card card-pad">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="label !mb-0">ช่วง “ล่าสุด”</h2>
          <span class="chip border-rule bg-tint font-mono text-acc-ink">{recentDays} วัน</span>
        </div>
        <p class="mb-3 mt-1.5 text-[13px] text-ink-soft">ใช้กับตัวกรอง “ล่าสุด” ในหน้ารายการ</p>
        <input id="recent-days" type="range" min="7" max="120" step="1" value={recentDays} oninput={(e) => $useFilterStore.setRecentDays(Number(e.currentTarget.value))} class="w-full accent-[var(--acc)]" />
        <div class="mt-1 flex justify-between font-mono text-[10px] text-ink-faint"><span>7</span><span>120</span></div>
      </section>
      <section class="card card-pad">
        <h2 class="label !mb-4">การซิงค์ข้อมูล</h2>
        <SyncStatus />
      </section>
    {/if}

    {#if tab === 'log'}
      <section class="card overflow-hidden">
        <div class="card-pad border-b border-rule">
          <h2 class="label !mb-0">บันทึกกิจกรรม</h2>
        </div>
        {#if !isAdmin}
          <p class="card-pad text-center text-sm text-ink-soft">เฉพาะผู้ดูแลเท่านั้น</p>
        {:else if auditState === 'loading' || auditState === 'idle'}
          <p class="card-pad text-center text-sm text-ink-soft" role="status">กำลังโหลดบันทึกกิจกรรม…</p>
        {:else if auditState === 'error'}
          <div class="card-pad text-center text-sm" role="alert">
            <p class="font-semibold text-danger-ink">โหลดบันทึกกิจกรรมไม่สำเร็จ</p>
            <button type="button" onclick={() => void loadAudit()} class="btn btn-pop mt-3">ลองใหม่</button>
          </div>
        {:else if audit.length === 0}
          <p class="card-pad text-center text-sm text-ink-soft">ยังไม่มีกิจกรรม</p>
        {:else}
          <div class="card-pad">
            {#each audit as e (e.id)}
              {@const meta = AUDIT_LABELS[e.action] ?? { tag: '·', label: e.action, tone: 'a' as const }}
              <div class="row grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-0">
                <span aria-hidden="true" class="chip size-8 shrink-0 place-items-center {TONE[meta.tone]}">{meta.tag}</span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-ink">{meta.label}{#if typeof e.payload?.name === 'string' && e.payload.name} · {e.payload.name}{/if}</span>
                  <span class="mono mt-0.5 block truncate text-xs text-ink-faint">{e.target ?? '—'}</span>
                </span>
                <span class="mono shrink-0 text-[11px] text-ink-faint">{formatDateTime(e.createdAt)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    {#if tab === 'account'}
      <section class="card card-pad">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="label !mb-0">แอปและบัญชี</h2>
          <span class="mono text-[10px] tracking-[0.14em] text-ink-faint uppercase">DATA Ledger · V5</span>
        </div>
        <div class="space-y-1">
          <button type="button" onclick={() => (pwa.isIOS ? undefined : (pwa.canInstall ? void pwa.install() : undefined))} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-ink transition-colors hover:bg-paper-2">
            <DownloadSimple size={18} aria-hidden="true" /> ติดตั้งแอป
            {#if pwa.isIOS}<span class="ml-auto text-xs text-ink-faint">ใช้เมนู Share ใน Safari</span>{:else if !pwa.canInstall}<span class="ml-auto text-xs text-ink-faint">เปิดใน Chrome/Edge เพื่อติดตั้ง</span>{/if}
          </button>
          <button type="button" onclick={() => void checkForAppUpdate()} disabled={appUpdateState === 'checking'} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-ink transition-colors hover:bg-paper-2 disabled:opacity-60">
            <ArrowsClockwise size={18} class={appUpdateState === 'checking' ? 'spin' : ''} aria-hidden="true" />
            {appUpdateState === 'checking' ? 'กำลังตรวจหาอัปเดต…' : 'ตรวจหาอัปเดตแอป'}
            {#if appUpdateState === 'latest'}<span class="ml-auto text-xs text-ink-faint">เป็นเวอร์ชันล่าสุด</span>{/if}
            {#if appUpdateState === 'error'}<span class="ml-auto text-xs font-semibold text-danger-ink">ตรวจสอบไม่สำเร็จ</span>{/if}
          </button>
          {#if isSignedIn}
            <button type="button" onclick={() => void logout()} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-danger-ink transition-colors hover:bg-danger-tint">
              <SignOut size={18} aria-hidden="true" /> ออกจากระบบ
            </button>
          {:else}
            <button type="button" onclick={() => setLoginOpen(true)} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-ink transition-colors hover:bg-paper-2">
              <LockKey size={18} aria-hidden="true" /> เข้าสู่ระบบ
            </button>
          {/if}
        </div>
      </section>
    {/if}
  </div>
</section>
