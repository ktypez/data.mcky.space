<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowsClockwise, DownloadSimple, LockKey, Monitor, Moon, SignOut, Sun } from 'phosphor-svelte'
  import SyncStatus from '@/components/SyncStatus.svelte'
  import AppThemePicker from '@/components/AppThemePicker.svelte'
  import { createPwaInstall } from '@/lib/create-pwa-install.svelte'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { manuallyUpdateApp, getRememberedRegistration } from '@/lib/pwa-update'
  import { getTheme } from '@/lib/design/themes'
  import { appTheme, setMode, setThemeId, setCustomPalette, themeSupportsMode } from '@/lib/app-theme'

  let isSignedIn = $derived($useAuthStore.isSignedIn)
  let setLoginOpen = $derived($useAuthStore.setLoginOpen)
  let theme = $derived($appTheme)
  let selectedTheme = $derived(getTheme(theme.themeId))

  const pwa = createPwaInstall()
  onMount(() => pwa.init())

  type Tab = 'look' | 'data' | 'account'
  const TABS: { key: Tab; label: string }[] = [
    { key: 'look', label: 'ธีมและการแสดงผล' },
    { key: 'data', label: 'ข้อมูลและซิงก์' },
    { key: 'account', label: 'แอปและบัญชี' },
  ]
  let tab = $state<Tab>('look')

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
