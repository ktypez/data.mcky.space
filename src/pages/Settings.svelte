<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowsClockwise, DownloadSimple, LockKey, Monitor, Moon, SignOut, Sun } from 'phosphor-svelte'
  import SyncStatus from '@/components/SyncStatus.svelte'
  import AppThemePicker from '@/components/AppThemePicker.svelte'
  import { createPwaInstall } from '@/lib/create-pwa-install.svelte'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { manuallyUpdateApp, getRememberedRegistration } from '@/lib/pwa-update'
  import { treatyClient, treatyHeaders } from '@/lib/treaty'
  import { formatDateTime } from '@/lib/utils'
  import { useFilterStore } from '@/stores/filter-store'
  import { getTheme } from '@/lib/design/themes'
  import { appTheme, setMode, setThemeId, setCustomPalette, themeSupportsMode } from '@/lib/app-theme'

  let isAdmin = $derived($useAuthStore.isAdmin)
  let isSignedIn = $derived($useAuthStore.isSignedIn)
  let setLoginOpen = $derived($useAuthStore.setLoginOpen)
  let theme = $derived($appTheme)
  let recentDays = $derived($useFilterStore.recentDays)
  let selectedTheme = $derived(getTheme(theme.themeId))

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
  const TONE: Record<'p' | 'a' | 'd', string> = { p: 'bg-primary/10 text-primary', a: 'bg-accent/15 text-foreground', d: 'bg-destructive/10 text-destructive' }

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

  const modeItems = ['auto', 'light', 'dark'] as const

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

<section class="mx-auto max-w-[1000px] px-3 pb-8 pt-6 sm:px-8">
  <p class="ledger-eyebrow">ตั้งค่า</p>
  <h1 class="mb-5 text-[clamp(22px,6vw,28px)] font-bold tracking-tight">เมนูและการตั้งค่า</h1>
  <div class="flex flex-col gap-4 min-[900px]:grid min-[900px]:grid-cols-[220px_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-6">
  <div role="tablist" aria-label="หมวดการตั้งค่า" aria-orientation="vertical" class="flex gap-1 overflow-x-auto rounded-[14px] border border-border bg-muted p-1 min-[900px]:flex-col min-[900px]:overflow-visible min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0">
    {#each TABS as t}
      <button type="button" role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls="settings-panel" onclick={() => (tab = t.key)} class="min-h-11 shrink-0 whitespace-nowrap rounded-[11px] px-3.5 text-left text-[13px] font-medium {tab === t.key ? 'bg-card text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}">{t.label}</button>
    {/each}
  </div>
  <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} class="min-w-0 space-y-4">
    {#if tab === 'data'}
    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="flex items-center justify-between gap-3"><label for="recent-days" class="text-[15px] font-bold">ช่วง “ล่าสุด”</label><span class="font-mono text-[13px] text-primary">{recentDays} วัน</span></div>
      <p class="mb-3 mt-1 text-[13px] text-muted-foreground">ใช้กับตัวกรอง “ล่าสุด” ในหน้ารายการ</p>
      <input id="recent-days" type="range" min="7" max="120" step="1" value={recentDays} oninput={(e) => $useFilterStore.setRecentDays(Number(e.currentTarget.value))} class="w-full accent-[var(--primary)]" />
      <div class="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>7</span><span>120</span></div>
    </section>
    <section class="rounded-2xl border border-border bg-card p-5">
      <h2 class="ledger-eyebrow mb-4">การซิงค์ข้อมูล</h2>
      <SyncStatus />
    </section>
    {/if}
    {#if tab === 'look'}
    <section class="rounded-2xl border border-border bg-card p-5">
      <h2 class="ledger-eyebrow mb-4">ธีม</h2>
      <AppThemePicker themeId={theme.themeId} setThemeId={setThemeId} customPalette={theme.customPalette} setCustomPalette={setCustomPalette} />
    </section>

    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="ledger-eyebrow">โหมดสี</h2>
        <span class="font-mono text-xs text-muted-foreground">{selectedTheme.label}</span>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="เลือกโหมดสี">
        {#each modeItems as item}
          {@const label = item === 'auto' ? 'ตามระบบ' : item === 'light' ? 'สว่าง' : 'มืด'}
          {@const supported = themeSupportsMode(selectedTheme, item)}
          {@const description = supported
            ? item === 'auto'
              ? 'ใช้ค่าจากเครื่อง'
              : item === 'light'
                ? 'พื้นหลังสว่าง'
                : 'พื้นหลังมืด'
            : `ธีมนี้ไม่รองรับ${item === 'light' ? 'สว่าง' : 'มืด'}`}
          {@const active = theme.mode === item || (theme.mode === 'auto' && selectedTheme.modes?.length === 1 && selectedTheme.modes[0] === item)}
          <button type="button" role="radio" aria-checked={active} onclick={() => setMode(item)} disabled={!supported} aria-label={`ใช้โหมด${label}`} class="flex min-h-[76px] items-center gap-3 rounded-[10px] border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:block sm:min-h-[92px] {active ? 'border-primary bg-muted text-foreground ring-1 ring-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'}">
            {#if item === 'auto'}
              <Monitor size={20} weight={active ? 'fill' : 'regular'} class="shrink-0 sm:mb-2" aria-hidden />
            {:else if item === 'light'}
              <Sun size={20} weight={active ? 'fill' : 'regular'} class="shrink-0 sm:mb-2" aria-hidden />
            {:else}
              <Moon size={20} weight={active ? 'fill' : 'regular'} class="shrink-0 sm:mb-2" aria-hidden />
            {/if}
            <span class="block"><span class="block text-sm font-medium">{label}{#if active}<span class="ml-1 text-primary">✓</span>{/if}</span><span class="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
          </button>
        {/each}
      </div>
    </section>
    {/if}

    {#if tab === 'log'}
    <section class="rounded-2xl border border-border bg-card px-5 py-1">
      {#if !isAdmin}
        <p class="py-6 text-center text-sm text-muted-foreground">เฉพาะผู้ดูแลเท่านั้น</p>
      {:else if auditState === 'loading' || auditState === 'idle'}
        <p class="py-6 text-center text-sm text-muted-foreground" role="status">กำลังโหลดบันทึกกิจกรรม…</p>
      {:else if auditState === 'error'}
        <div class="py-6 text-center text-sm" role="alert"><p class="text-destructive">โหลดบันทึกกิจกรรมไม่สำเร็จ</p><button type="button" onclick={() => void loadAudit()} class="mt-3 min-h-11 rounded-xl border border-border px-4 text-sm hover:bg-muted">ลองใหม่</button></div>
      {:else if audit.length === 0}
        <p class="py-6 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>
      {:else}
        {#each audit as e (e.id)}
          {@const meta = AUDIT_LABELS[e.action] ?? { tag: '·', label: e.action, tone: 'a' as const }}
          <div class="flex items-start gap-3 border-b border-border py-3.5 last:border-b-0">
            <span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-[9px] font-mono text-[10px] font-semibold {TONE[meta.tone]}">{meta.tag}</span>
            <span class="min-w-0 flex-1"><span class="block text-sm font-semibold">{meta.label}{#if typeof e.payload?.name === 'string' && e.payload.name} · {e.payload.name}{/if}</span><span class="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{e.target ?? '—'}</span></span>
            <span class="shrink-0 font-mono text-[11px] text-muted-foreground">{formatDateTime(e.createdAt)}</span>
          </div>
        {/each}
      {/if}
    </section>
    {/if}

    {#if tab === 'account'}
    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-2 flex items-center justify-between gap-3">
        <h2 class="ledger-eyebrow">แอปและบัญชี</h2>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">DATA Ledger · V4</span>
      </div>
      <div class="space-y-1">
        <button type="button" onclick={() => (pwa.isIOS ? undefined : (pwa.canInstall ? void pwa.install() : undefined))} class="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm hover:bg-muted"><DownloadSimple size={18} aria-hidden /> ติดตั้งแอป{#if pwa.isIOS}<span class="ml-auto text-xs text-muted-foreground">ใช้เมนู Share ใน Safari</span>{:else if !pwa.canInstall}<span class="ml-auto text-xs text-muted-foreground">เปิดใน Chrome/Edge เพื่อติดตั้ง</span>{/if}</button>
        <button type="button" onclick={() => void checkForAppUpdate()} disabled={appUpdateState === 'checking'} class="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm hover:bg-muted disabled:opacity-60">
          <ArrowsClockwise size={18} class={appUpdateState === 'checking' ? 'animate-spin' : ''} aria-hidden />
          {appUpdateState === 'checking' ? 'กำลังตรวจหาอัปเดต…' : 'ตรวจหาอัปเดตแอป'}
          {#if appUpdateState === 'latest'}<span class="ml-auto text-xs text-muted-foreground">เป็นเวอร์ชันล่าสุด</span>{/if}
          {#if appUpdateState === 'error'}<span class="ml-auto text-xs text-destructive">ตรวจสอบไม่สำเร็จ</span>{/if}
        </button>
        {#if isSignedIn}
          <button type="button" onclick={() => void logout()} class="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm hover:bg-muted"><SignOut size={18} aria-hidden /> ออกจากระบบ</button>
        {:else}
          <button type="button" onclick={() => setLoginOpen(true)} class="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm hover:bg-muted"><LockKey size={18} aria-hidden /> เข้าสู่ระบบ</button>
        {/if}
      </div>
    </section>
    {/if}
  </div>
  </div>
</section>
