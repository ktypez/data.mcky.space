<script lang="ts">
  import { LockKey, Monitor, Moon, SignOut, Sun, Warning } from 'phosphor-svelte'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { useFilterStore } from '@/stores/filter-store'
  import { getTheme, themes } from '@/lib/design/themes'
  import { appTheme, setMode, setThemeId, setCustomPalette, themeSupportsMode, contrastRatio, readableForeground, DEFAULT_CUSTOM_PALETTE } from '@/lib/app-theme'

  type Section = 'appearance' | 'data' | 'activity'
  let section = $state<Section>('appearance')

  let isSignedIn = $derived($useAuthStore.isSignedIn)
  let setLoginOpen = $derived($useAuthStore.setLoginOpen)
  let theme = $derived($appTheme)
  let selectedTheme = $derived(getTheme(theme.themeId))
  let clients = $derived($useClientStore.clients)
  let filterStore = $derived($useFilterStore)

  const SWATCHES = ['#1f6f54', '#c8603a', '#1d4ed8', '#b03a6b', '#7c5cbf', '#0f766e', '#b45309', '#0a0a0a']

  const presetThemes = themes.filter((t) => t.id !== 'custom')

  let activePalette = $derived(theme.resolvedMode === 'dark' ? selectedTheme.dark : selectedTheme.light)
  let primary = $derived(theme.themeId === 'custom' ? theme.customPalette[theme.resolvedMode].primary : (activePalette as any)?.['--primary'] ?? '#1f6f54')
  let cardBg = $derived(theme.themeId === 'custom' ? theme.customPalette[theme.resolvedMode].surface : (activePalette as any)?.['--card'] ?? '#ffffff')
  let ratio = $derived(contrastRatio(primary, cardBg))
  let unsafe = $derived(ratio < 3)

  let modeItems = ['auto', 'light', 'dark'] as const

  let recentDays = $derived(Math.round((Date.now() - filterStore.recentCutoff) / 86400000))

  function setRecentDays(days: number) {
    useFilterStore.getState().setRecentCutoff(Date.now() - days * 86400000)
  }

  function setCustomPrimary(hex: string) {
    const fg = readableForeground(hex)
    const base = theme.customPalette
    setCustomPalette({
      light: { ...base.light, primary: hex, primaryForeground: fg },
      dark: { ...base.dark, primary: hex, primaryForeground: fg },
    })
    setThemeId('custom')
  }

  function resetCustomPrimary() {
    setCustomPalette(DEFAULT_CUSTOM_PALETTE)
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
      <!-- Mode -->
      <div class="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div class="mb-2 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">โหมดสี</p>
            <p class="text-[11px] text-muted-foreground">จดจำไว้ในเครื่องนี้ ไม่ขึ้นกับระบบ</p>
          </div>
          <div class="flex gap-1 rounded-xl bg-muted p-1">
            {#each modeItems as item}
              {@const label = item === 'auto' ? 'ตามระบบ' : item === 'light' ? 'สว่าง' : 'มืด'}
              {@const supported = themeSupportsMode(selectedTheme, item)}
              <button
                type="button"
                onclick={() => setMode(item)}
                aria-pressed={theme.mode === item}
                aria-label="ใช้โหมด{label}"
                disabled={!supported}
                class="grid size-9 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-45 {theme.mode === item ? 'bg-card shadow-sm' : 'text-muted-foreground'}"
              >
                {#if item === 'auto'}<Monitor size={16} />
                {:else if item === 'light'}<Sun size={16} />
                {:else}<Moon size={16} />{/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Theme grid -->
      <div class="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <p class="mb-2 text-sm font-medium">ชุดธีม</p>
        <div class="grid grid-cols-2 gap-2">
          {#each presetThemes as t}
            {@const p = theme.resolvedMode === 'dark' ? t.dark : t.light}
            {@const active = t.id === theme.themeId}
            <button
              type="button"
              onclick={() => setThemeId(t.id)}
              aria-pressed={active}
              class="flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors {active ? 'border-primary/50 bg-primary/8' : 'border-border hover:bg-muted'}"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg border" style="background: {p['--background']}; border-color: {p['--border']}">
                <span class="size-4 rounded-full" style="background: {p['--primary']}"></span>
              </span>
              <span class="min-w-0">
                <span class="block truncate text-xs font-medium">{t.label}</span>
                <span class="block truncate text-[10px] text-muted-foreground">{t.description}</span>
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Custom primary -->
      <div class="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <p class="text-sm font-medium">สีหลักกำหนดเอง</p>
        <p class="mb-2 text-[11px] text-muted-foreground">แทนที่สีหลักของธีมที่เลือก ระบบจะเตือนเมื่อคอนทราสต์ต่ำเกินไป</p>
        <div class="flex flex-wrap items-center gap-2">
          {#each SWATCHES as hex}
            <button
              type="button"
              onclick={() => setCustomPrimary(hex)}
              aria-label="ใช้สี {hex}"
              class="size-8 rounded-lg border-2 {theme.themeId === 'custom' && primary === hex ? 'border-foreground' : 'border-border'}"
              style="background: {hex}"
            ></button>
          {/each}
          <input
            type="color"
            aria-label="เลือกสีเอง"
            value={primary}
            onchange={(e) => setCustomPrimary((e.currentTarget as HTMLInputElement).value)}
            class="size-8 cursor-pointer rounded-lg border border-border bg-card"
          />
          {#if theme.themeId === 'custom'}
            <button type="button" onclick={resetCustomPrimary} class="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">คืนค่าธีม</button>
          {/if}
        </div>
        <p class="mt-2 font-mono text-[11px] text-muted-foreground">contrast {ratio.toFixed(2)}:1</p>
        {#if unsafe}
          <p class="mt-1 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
            <Warning size={14} /> คอนทราสต์ต่ำกว่า 3:1 — ข้อความบนพื้นการ์ดอาจอ่านยาก
          </p>
        {/if}
      </div>

      <!-- Recent cutoff -->
      <div class="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <p class="text-sm font-medium">ช่วง "ล่าสุด"</p>
        <p class="mb-2 text-[11px] text-muted-foreground">ใช้คำนวณตัวกรองล่าสุดในหน้ารายการ ({recentDays} วัน)</p>
        <input type="range" min={7} max={120} step={1} value={recentDays} oninput={(e) => setRecentDays(Number((e.currentTarget as HTMLInputElement).value))} aria-label="จำนวนวันของตัวกรองล่าสุด" class="w-full accent-[var(--primary)]" />
      </div>
    </div>
  {:else if section === 'data'}
    <div class="space-y-3">
      <!-- Admin status -->
      <div class="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <p class="mb-1 text-sm font-medium">สถานะผู้ดูแล</p>
        <p class="mb-2 text-[11px] text-muted-foreground">การเพิ่ม แก้ไข ลบ และกู้คืน ต้องยืนยันตัวตนทั้งฝั่งเบราว์เซอร์และ API</p>
        {#if isSignedIn}
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] text-primary">เข้าสู่ระบบแล้ว</span>
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

      <!-- Stats -->
      <div class="rounded-2xl border border-border bg-card divide-y divide-border shadow-sm">
        {#each [
          ['ระเบียนทั้งหมด', clients.length.toLocaleString('th-TH')],
          ['มีพิกัด', clients.filter((c) => c.lat != null).length.toLocaleString('th-TH')],
          ['มีรูปภาพ', clients.filter((c) => c.images.length > 0).length.toLocaleString('th-TH')],
          ['ที่เก็บข้อมูล', 'Cloudflare D1 + R2'],
          ['เวอร์ชัน', 'DATA Ledger · V3'],
        ] as [k, v]}
          <div class="flex items-center justify-between px-3 py-2.5 text-sm">
            <span class="text-muted-foreground">{k}</span>
            <span class="font-mono text-xs">{v}</span>
          </div>
        {/each}
      </div>

      <!-- Reset demo data (placeholder, wiring later) -->
      <div class="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium">รีเซ็ตข้อมูลตัวอย่าง</p>
            <p class="text-[11px] text-muted-foreground">คืนค่าชุดข้อมูลสาธิตและล้างบันทึกกิจกรรม</p>
          </div>
          <button type="button" class="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">รีเซ็ต</button>
        </div>
      </div>
    </div>
  {:else}
    <div class="rounded-2xl border border-border bg-card divide-y divide-border shadow-sm">
      <p class="p-6 text-center text-xs text-muted-foreground">ยังไม่มีกิจกรรมในเครื่องนี้</p>
    </div>
  {/if}
</div>