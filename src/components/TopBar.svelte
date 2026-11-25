<script lang="ts">
import { ListBullets, MapTrifold, Trash, Gear, Plus, SignIn, SignOut, MagnifyingGlass } from 'phosphor-svelte'
  import { push, router } from 'svelte-spa-router'
import { appTheme, setMode, setPalette } from '@/lib/app-theme'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { getClerk } from '@/lib/clerk'
  import { useFilterStore } from '@/stores/filter-store'
  import { FilterKey } from '@/types/index'
  import { isFormDirty, askLeave } from '@/lib/form-dirty'

  let isAdmin = $derived($useAuthStore.isAdmin)
  let signedIn = $derived($useAuthStore.isSignedIn)
  let theme = $derived($appTheme)

  // Clerk identity for the account menu (name + email + monogram).
  let account = $state<{ name: string; email: string }>({ name: '', email: '' })
  $effect(() => {
    if (!signedIn) {
      account = { name: '', email: '' }
      return
    }
    const user = getClerk()?.user
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
    account = {
      name: name || user?.username || 'ผู้ใช้',
      email: user?.primaryEmailAddress?.emailAddress ?? '',
    }
  })

  let menuOpen = $state(false)
  let menuRef: HTMLDivElement | undefined = $state()

  // Outside-click + Escape close the account menu.
  $effect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef?.contains(e.target as Node)) menuOpen = false
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (menuOpen = false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  })

  const navItems = [
    { to: '/', label: 'รายการ', icon: ListBullets },
    { to: '/maps', label: 'แผนที่', icon: MapTrifold },
    { to: '/trash', label: 'ถังขยะ', icon: Trash },
    { to: '/settings', label: 'ตั้งค่า', icon: Gear },
  ]
  const palettes = [
    { id: 'mochi', label: 'Mochi', color: 'hsl(256 58% 68%)' },
    { id: 'matcha', label: 'Matcha', color: 'hsl(158 58% 48%)' },
    { id: 'soda', label: 'Soda', color: 'hsl(222 58% 64%)' },
    { id: 'sakura', label: 'Sakura', color: 'hsl(338 65% 68%)' },
  ]
  const isActive = (to: string) => (to === '/' ? router.location === '/' : router.location.startsWith(to))

  let lastHomeTap = 0
  function handleHomeClick(event: MouseEvent) {
    if (isFormDirty()) {
      event.preventDefault()
      event.stopPropagation()
      askLeave(() => push('/'))
      return
    }
    const now = Date.now()
    if (now - lastHomeTap < 300) {
      // Double tap: clear search and filter
      useFilterStore.getState().setSearch('')
      useFilterStore.getState().setFilter(FilterKey.All)
      lastHomeTap = 0
    } else {
      push('/')
      lastHomeTap = now
    }
  }

  function guard(event: MouseEvent, to: string) {
    if (!isFormDirty()) return
    event.preventDefault()
    event.stopPropagation()
    askLeave(() => push(to))
  }

  const monogram = $derived((account.name || '?').trim().charAt(0).toUpperCase() || '?')
</script>

<header class="sticky top-0 z-50 border-b border-rule bg-paper">
  <div class="mx-auto flex min-h-[var(--topbar-h)] max-w-[var(--maxw)] items-center justify-between gap-3 px-4 sm:px-6">
    <a href="#/" onclick={handleHomeClick} aria-label="DATA Ledger หน้าแรก" class="group flex items-center gap-2.5">
      <span class="brand-mark grid size-8 place-items-center rounded-[10px] bg-pri-fill text-pri-ink transition-transform duration-200 group-hover:-rotate-6" aria-hidden="true">
        <span class="font-mono text-[16px] font-bold">✳</span>
      </span>
      <span class="flex flex-col leading-none">
        <span class="text-[14px] font-bold tracking-[.04em] text-ink">DATA</span>
        <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-ink-faint">Ledger</span>
      </span>
    </a>

    <nav class="topbar-nav flex items-center gap-1" aria-label="เมนูหลัก">
      {#each navItems as item}
        <a
          href={`#${item.to}`}
          aria-current={isActive(item.to) ? 'page' : undefined}
          onclick={(e) => guard(e, item.to)}
          class="nav-link flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 {isActive(item.to)
            ? 'bg-card text-pri shadow-sm'
            : 'text-ink-soft hover:bg-paper-2 hover:text-ink'}"
        >
          <item.icon size={15} weight="bold" aria-hidden="true" />
          {item.label}
        </a>
      {/each}
      {#if isAdmin}
        <a
          href="#/add"
          aria-current={router.location === '/add' ? 'page' : undefined}
          onclick={(e) => guard(e, '/add')}
          class="btn btn-acc ml-1 !px-3.5 !py-2 text-[13px]"
        >
          <Plus size={15} weight="bold" aria-hidden="true" />
          <span class="hidden sm:inline">เพิ่มรายการ</span>
        </a>
      {/if}
    </nav>

    <div class="flex shrink-0 items-center gap-2">
      <div class="palette-dots hidden items-center gap-1.5 rounded-full border border-rule bg-paper-3 p-1.5 sm:flex" role="group" aria-label="เปลี่ยนชุดสี">
        {#each palettes as palette}
          <button type="button" class="palette-dot" class:active={theme.palette === palette.id} style={`--dot:${palette.color}`} title={palette.label} aria-label={`ใช้ชุดสี ${palette.label}`} aria-pressed={theme.palette === palette.id} onclick={() => setPalette(palette.id)}></button>
        {/each}
      </div>
      <button type="button" class="mode-toggle" aria-label={theme.resolvedMode === 'dark' ? 'ใช้โหมดสว่าง' : 'ใช้โหมดมืด'} title={theme.resolvedMode === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'} onclick={() => setMode(theme.resolvedMode === 'dark' ? 'light' : 'dark')}>
        {#if theme.resolvedMode === 'dark'}<span aria-hidden="true">☀</span>{:else}<span aria-hidden="true">☾</span>{/if}
      </button>

      <button type="button" class="command-trigger" onclick={() => window.dispatchEvent(new Event('open-command-palette'))} aria-label="ค้นหารายการ (⌘K)">
        <MagnifyingGlass size={16} aria-hidden="true" />
        <span class="hidden md:inline">ค้นหา</span>
        <kbd class="kbd hidden lg:inline-flex">⌘K</kbd>
      </button>

      {#if signedIn}
        <div class="relative" bind:this={menuRef}>
          <button
            type="button"
            onclick={() => (menuOpen = !menuOpen)}
            class="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-rule-2 bg-acc font-mono text-[14px] font-bold text-acc-ink shadow-sm transition-transform hover:-translate-y-px"
            aria-label="เมนูบัญชี"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {monogram}
          </button>
          {#if menuOpen}
            <div
              role="menu"
              aria-label="เมนูบัญชี"
              class="sticker pop-dots absolute right-0 mt-2.5 w-56 rounded-2xl p-2"
            >
              <div class="border-b border-dashed border-rule px-3 pt-2 pb-3">
                <p class="text-sm font-bold text-ink">{account.name}</p>
                {#if account.email}<p class="mt-0.5 truncate font-mono text-[11px] text-ink-faint">{account.email}</p>{/if}
                {#if isAdmin}<span class="chip mt-1.5 bg-tint text-acc-ink">ผู้ดูแล</span>{/if}
              </div>
              <button
                type="button"
                class="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger-ink transition-colors hover:bg-danger-tint"
                onclick={() => {
                  menuOpen = false
                  void logout()
                }}
              >
                <SignOut size={15} weight="bold" aria-hidden="true" />
                ออกจากระบบ
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <button type="button" class="btn btn-pop !px-4 !py-2 text-[13px]" onclick={() => push('/login')}>
          <SignIn size={15} weight="bold" aria-hidden="true" />
          เข้าสู่ระบบ
        </button>
      {/if}
    </div>
  </div>

</header>

<style>
  header { background:color-mix(in srgb,var(--paper) 88%,transparent); backdrop-filter:blur(12px); border-color:var(--rule); }
  .topbar-nav { padding:3px; border:1px solid var(--rule); border-radius:999px; background:var(--paper-3); }
  .brand-mark { box-shadow:0 3px 10px color-mix(in srgb,var(--pri) 24%,transparent); }
  .mode-toggle,.command-trigger { display:inline-flex; align-items:center; justify-content:center; gap:7px; height:36px; flex:none; border:1px solid var(--rule); border-radius:999px; background:var(--card); color:var(--ink-soft); transition:transform var(--mochi-duration-fast) var(--mochi-ease-spring),background var(--mochi-duration) var(--mochi-ease-out),color var(--mochi-duration) var(--mochi-ease-out); }
  .mode-toggle { width:36px; color:var(--pri); font-size:19px; }
  .command-trigger { padding:0 10px 0 12px; font-size:13px; font-weight:600; }
  .mode-toggle:hover,.command-trigger:hover { transform:translateY(-1px); background:var(--pri-soft); color:var(--pri-ink); }
  .palette-dot { width:15px; height:15px; flex:none; border:2px solid transparent; border-radius:50%; background:var(--dot); transition:transform var(--mochi-duration-fast) var(--mochi-ease-spring); }
  .palette-dot:hover { transform:scale(1.18); }
  .palette-dot.active { border-color:var(--ink); box-shadow:0 0 0 2px var(--card); }
  @media (max-width:800px) { .topbar-nav { gap:0; } .nav-link { padding-inline:9px; } }
  @media (max-width:640px) { .nav-link { font-size:0; gap:0; padding:9px; } .nav-link :global(svg) { width:18px; height:18px; } .brand-mark { width:30px; height:30px; } .command-trigger { width:36px; padding:0; } }
</style>
