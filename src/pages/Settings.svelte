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

<section class="mx-auto max-w-xl px-5 pb-8 pt-6 sm:px-6">
  <h1 class="sr-only">เมนูและการตั้งค่า</h1>
  <div class="space-y-4">
    <section class="rounded-2xl border border-border bg-card p-4">
      <h2 class="mb-3 text-sm font-semibold">การซิงค์ข้อมูล</h2>
      <SyncStatus />
    </section>
    <section class="rounded-2xl border border-border bg-card p-4">
      <h2 class="mb-3 text-sm font-semibold">ธีม</h2>
      <AppThemePicker themeId={theme.themeId} setThemeId={setThemeId} customPalette={theme.customPalette} setCustomPalette={setCustomPalette} />
    </section>

    <section class="rounded-2xl border border-border bg-card p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">โหมดสี</h2>
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
          <button type="button" role="radio" aria-checked={active} onclick={() => setMode(item)} disabled={!supported} aria-label={`ใช้โหมด${label}`} class="flex min-h-[76px] items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:block sm:min-h-[92px] {active ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'}">
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

    <section class="rounded-2xl border border-border bg-card p-4">
      <div class="mb-2 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">แอปและบัญชี</h2>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">DATA Ledger · V3</span>
      </div>
      <div class="space-y-1">
        {#if pwa.canInstall}
          <button type="button" onclick={() => (pwa.isIOS ? undefined : void pwa.install())} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><DownloadSimple size={18} aria-hidden /> ติดตั้งแอป{#if pwa.isIOS}<span class="ml-auto text-xs text-muted-foreground">ใช้เมนู Share ใน Safari</span>{/if}</button>
        {/if}
        <button type="button" onclick={() => void checkForAppUpdate()} disabled={appUpdateState === 'checking'} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted disabled:opacity-60">
          <ArrowsClockwise size={18} class={appUpdateState === 'checking' ? 'animate-spin' : ''} aria-hidden />
          {appUpdateState === 'checking' ? 'กำลังตรวจหาอัปเดต…' : 'ตรวจหาอัปเดตแอป'}
          {#if appUpdateState === 'latest'}<span class="ml-auto text-xs text-muted-foreground">เป็นเวอร์ชันล่าสุด</span>{/if}
          {#if appUpdateState === 'error'}<span class="ml-auto text-xs text-destructive">ตรวจสอบไม่สำเร็จ</span>{/if}
        </button>
        {#if isSignedIn}
          <button type="button" onclick={() => void logout()} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><SignOut size={18} aria-hidden /> ออกจากระบบ</button>
        {:else}
          <button type="button" onclick={() => setLoginOpen(true)} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><LockKey size={18} aria-hidden /> เข้าสู่ระบบ</button>
        {/if}
      </div>
    </section>
  </div>
</section>
