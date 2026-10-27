<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowsClockwise, DownloadSimple, LockKey, Monitor, Moon, SignOut, Sun } from 'phosphor-svelte'
  import SyncStatus from '@/components/SyncStatus.svelte'
  import AppThemePicker from '@/components/AppThemePicker.svelte'
  import { createPwaInstall } from '@/lib/create-pwa-install.svelte'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { manuallyUpdateApp, getRememberedRegistration } from '@/lib/pwa-update'
  import { getTheme } from '@/lib/design/themes'
  import { appTheme, setMode, setThemeId, setCustomPalette, themeSupportsMode } from '@/lib/app-theme'

  type Section = 'appearance' | 'data' | 'activity'
  let section = $state<Section>('appearance')

  let isSignedIn = $derived($useAuthStore.isSignedIn)
  let setLoginOpen = $derived($useAuthStore.setLoginOpen)
  let theme = $derived($appTheme)
  let selectedTheme = $derived(getTheme(theme.themeId))
  let clients = $derived($useClientStore.clients)

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

  const tabs: { key: Section; label: string }[] = [
    { key: 'appearance', label: 'ธีมและการแสดงผล' },
    { key: 'data', label: 'ข้อมูล' },
    { key: 'activity', label: 'บันทึกกิจกรรม' },
  ]
</script>

<div class="scroll-thin mx-auto h-full max-w-xl overflow-y-auto px-3 pb-28 pt-4 sm:px-4">
  <h1 class="mb-3 font-display text-lg font-semibold">ตั้งค่า</h1>

  <div role="tablist" aria-label="หมวดการตั้งค่า" class="mb-3 flex gap-1 rounded-xl bg-muted p-1">
    {#each tabs as t}
      <button
        type="button"
        role="tab"
        aria-selected={section === t.key}
        onclick={() => (section = t.key)}
        class="h-9 flex-1 rounded-lg text-xs transition-colors {section === t.key ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground'}"
      >
        {t.label}
      </button>
    {/each}
  </div>

  {#if section === 'appearance'}
    <div class="space-y-3">
      <div class="rounded-2xl border border-border bg-card p-3">
        <h2 class="mb-3 text-sm font-semibold">ธีม</h2>
        <AppThemePicker themeId={theme.themeId} setThemeId={setThemeId} customPalette={theme.customPalette} setCustomPalette={setCustomPalette} />
      </div>

      <div class="rounded-2xl border border-border bg-card p-3">
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
            <button type="button" role="radio" aria-checked={active} onclick={() => setMode(item)} disabled={!supported} aria-label="ใช้โหมด{label}" class="flex min-h-[76px] items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:block sm:min-h-[92px] {active ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'}">
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
      </div>
    </div>
  {:else if section === 'data'}
    <div class="space-y-3">
      <div class="rounded-2xl border border-border bg-card p-3">
        <h2 class="mb-3 text-sm font-semibold">การซิงค์ข้อมูล</h2>
        <SyncStatus />
      </div>

      <div class="rounded-2xl border border-border bg-card p-3">
        <p class="mb-1 text-sm font-medium">สถานะผู้ดูแล</p>
        <p class="mb-2 text-[11px] text-muted-foreground">
          การเพิ่ม แก้ไข ลบ และกู้คืน ต้องยืนยันตัวตนทั้งฝั่งเบราว์เซอร์และ API
        </p>
        {#if isSignedIn}
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] text-primary">
              เข้าสู่ระบบแล้ว
            </span>
            <button type="button" onclick={() => void logout()} class="ml-auto flex min-h-9 items-center gap-2 rounded-xl px-3 text-sm text-destructive hover:bg-destructive/10">
              <SignOut size={16} /> ออกจากระบบ
            </button>
          </div>
        {:else}
          <button type="button" onclick={() => setLoginOpen(true)} class="flex min-h-9 items-center gap-2 rounded-xl bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90">
            <LockKey size={16} /> เข้าสู่ระบบผู้ดูแล
          </button>
        {/if}
      </div>

      <div class="rounded-2xl border border-border bg-card divide-y divide-border">
        {#each [
          ['ระเบียนทั้งหมด', clients.length.toLocaleString('th-TH')],
          ['มีพิกัด', clients.filter((c) => c.lat != null).length.toLocaleString('th-TH')],
          ['มีรูปภาพ', clients.filter((c) => c.images.length > 0).length.toLocaleString('th-TH')],
        ] as [k, v]}
          <div class="flex items-center justify-between px-3 py-2.5 text-sm">
            <span class="text-muted-foreground">{k}</span>
            <span class="font-mono text-xs">{v}</span>
          </div>
        {/each}
      </div>

      <div class="rounded-2xl border border-border bg-card p-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold">แอปและบัญชี</h2>
          <span class="font-mono text-[10px] uppercase text-muted-foreground">DATA Ledger · V3</span>
        </div>
        <div class="space-y-1">
          <button type="button" onclick={() => (pwa.isIOS ? undefined : (pwa.canInstall ? void pwa.install() : undefined))} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted">
            <DownloadSimple size={18} aria-hidden /> ติดตั้งแอป
            {#if pwa.isIOS}<span class="ml-auto text-xs text-muted-foreground">ใช้เมนู Share ใน Safari</span>
            {:else if !pwa.canInstall}<span class="ml-auto text-xs text-muted-foreground">เปิดใน Chrome/Edge เพื่อติดตั้ง</span>{/if}
          </button>
          <button type="button" onclick={() => void checkForAppUpdate()} disabled={appUpdateState === 'checking'} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted disabled:opacity-60">
            <ArrowsClockwise size={18} class={appUpdateState === 'checking' ? 'animate-spin' : ''} aria-hidden />
            {appUpdateState === 'checking' ? 'กำลังตรวจหาอัปเดต…' : 'ตรวจหาอัปเดตแอป'}
            {#if appUpdateState === 'latest'}<span class="ml-auto text-xs text-muted-foreground">เป็นเวอร์ชันล่าสุด</span>{/if}
            {#if appUpdateState === 'error'}<span class="ml-auto text-xs text-destructive">ตรวจสอบไม่สำเร็จ</span>{/if}
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="rounded-2xl border border-border bg-card divide-y divide-border">
      <p class="p-6 text-center text-xs text-muted-foreground">
        ยังไม่มีกิจกรรมในเครื่องนี้
      </p>
    </div>
  {/if}
</div>