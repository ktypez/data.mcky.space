<script lang="ts">
  import { onMount } from 'svelte'
  import Router, { router, link, push } from 'svelte-spa-router'
import wrap from 'svelte-spa-router/wrap'
  import { House, Plus, Gear, MapTrifold, Trash, Sun, Moon, LockKey, ListBullets } from 'phosphor-svelte'
  import { useAuthStore } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { useFilterStore } from '@/stores/filter-store'
  import { FilterKey } from '@/types/index'
  import { isFormDirty } from '@/lib/form-dirty'
  import { appTheme, initAppTheme, setMode } from '@/lib/app-theme'
  import { initClerk } from '@/lib/clerk'
  import '@/lib/pwa-install'
  import { flushClientMutations } from '@/lib/offline-mutations'
  import CommandPalette from '@/components/CommandPalette.svelte'
  import UpdatePrompt from '@/components/UpdatePrompt.svelte'
  import '@/styles/ledger.css'

  import Login from './pages/Login.svelte'

  // svelte-spa-router treats a bare function route as a *sync* component and
  // wraps it in () => Promise.resolve(fn), so a lazy route must be passed
  // through wrap({ asyncComponent }) or the loader itself gets mounted.
  const routes = {
    '/': wrap({ asyncComponent: () => import('./pages/Catalog.svelte') }),
    '/add': wrap({ asyncComponent: () => import('./pages/Editor.svelte') }),
    '/edit/:id': wrap({ asyncComponent: () => import('./pages/Editor.svelte') }),
    '/trash': wrap({ asyncComponent: () => import('./pages/Trash.svelte') }),
    '/maps': wrap({ asyncComponent: () => import('./pages/Maps.svelte') }),
    '/settings': wrap({ asyncComponent: () => import('./pages/Settings.svelte') }),
    '/c/:id': wrap({ asyncComponent: () => import('./pages/Record.svelte') }),
    '/login': Login,
    '*': wrap({ asyncComponent: () => import('./pages/NotFound.svelte') }),
  }

  let theme = $derived($appTheme)
  let isAdmin = $derived($useAuthStore.isAdmin)
  let checking = $derived($useAuthStore.checking)
  let signedIn = $derived($useAuthStore.isSignedIn)
  let loginOpen = $derived($useAuthStore.loginOpen)

  let lastHomeTap = 0
  const DOUBLE_TAP_DELAY = 300 // ms

  function handleHomeClick(event: MouseEvent) {
    guardNavigation(event)
    if (event.defaultPrevented) return

    const now = Date.now()
    const isDoubleTap = now - lastHomeTap < DOUBLE_TAP_DELAY

    if (isDoubleTap) {
      // Double tap: clear search and filter
      useFilterStore.getState().setSearch('')
      useFilterStore.getState().setFilter(FilterKey.All)
      lastHomeTap = 0
    } else {
      // Single tap: navigate to home
      push('/')
      lastHomeTap = now
    }
  }

  onMount(() => {
    initAppTheme()
    void initClerk()
    void useClientStore.getState().initialize()
    const flush = () => {
      const userId = useAuthStore.getState().userId
      if (userId) void flushClientMutations(userId)
    }
    window.addEventListener('online', flush)
    flush()
    return () => {
      window.removeEventListener('online', flush)
    }
  })

  // v5 replaced the `location` store with the runes-backed `router` object, so
  // reset the main scroll container in an effect that tracks router.location.
  $effect(() => {
    void router.location
    document.getElementById('ledger-main')?.scrollTo({ top: 0 })
  })

  function guardNavigation(event: MouseEvent): void {
    if (isFormDirty() && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากฟอร์มไหม?')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const navItems = [
    { to: '/', label: 'รายการ', icon: ListBullets },
    { to: '/maps', label: 'แผนที่', icon: MapTrifold },
    { to: '/trash', label: 'ถังขยะ', icon: Trash },
    { to: '/settings', label: 'ตั้งค่า', icon: Gear },
  ]
  let offline = $derived($useClientStore.offline)
  let clientTotal = $derived($useClientStore.clients.length)
  const isActive = (to: string) => (to === '/' ? router.location === '/' : router.location.startsWith(to))
  const isDark = $derived(theme.resolvedMode === 'dark')

  const wantsLogin = $derived(router.location === '/login' || loginOpen)
</script>

{#if wantsLogin && !checking && !signedIn}
  <Login />
{:else}
  <div class="ledger-shell" data-mode={theme.resolvedMode}>
    <a href="#ledger-main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground">ข้ามไปเนื้อหา</a>
    <aside class="ledger-rail" aria-label="แถบนำทาง">
      <a href="/" use:link onclick={guardNavigation} aria-label="DATA Ledger หน้าแรก" class="ledger-rail-brand">
        <span class="ledger-rail-logo" aria-hidden="true"><ListBullets weight="bold" size={19} /></span>
        <span><span class="block text-[15px] font-bold leading-tight tracking-tight">DATA Ledger</span><span class="block font-mono text-[10px] text-muted-foreground">data.mcky.space · V4</span></span>
      </a>
      {#if isAdmin}
        <a href="/add" use:link onclick={guardNavigation} class="ledger-rail-add"><Plus weight="bold" size={17} aria-hidden /> เพิ่มระเบียน</a>
      {/if}
      <nav class="flex flex-col gap-0.5" aria-label="เมนูหลัก">
        {#each navItems as item}
          <a href={item.to} use:link onclick={guardNavigation} aria-current={isActive(item.to) ? 'page' : undefined} class="ledger-rail-link" class:is-active={isActive(item.to)}>
            <item.icon size={18} weight={isActive(item.to) ? 'fill' : 'regular'} aria-hidden />
            {item.label}
            {#if item.to === '/' && clientTotal > 0}<span class="ml-auto font-mono text-[11px]">{clientTotal.toLocaleString('th-TH')}</span>{/if}
          </a>
        {/each}
      </nav>
      <div class="mt-auto flex items-center gap-2">
        {#if !isAdmin && !signedIn}
          <a href="/login" use:link class="ledger-rail-link flex-1 border border-border bg-card"><LockKey size={17} aria-hidden /> เข้าสู่ระบบ</a>
        {:else if isAdmin}
          <span class="ledger-rail-link flex-1 border border-border bg-card"><span class="grid size-[26px] place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary" aria-hidden="true">AD</span> ผู้ดูแล</span>
        {:else}
          <span class="flex-1"></span>
        {/if}
        <button type="button" onclick={() => setMode(isDark ? 'light' : 'dark')} aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'} class="grid size-11 shrink-0 place-items-center rounded-[12px] border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground">
          {#if isDark}<Sun size={17} aria-hidden />{:else}<Moon size={17} aria-hidden />{/if}
        </button>
      </div>
    </aside>
    <div class="ledger-col">
    <header class="ledger-header relative z-40 shrink-0 border-b border-border bg-card/85 backdrop-blur">
      <div class="mx-auto flex min-h-16 max-w-6xl items-center gap-2 px-3 sm:px-8">
        <a href="/" use:link onclick={guardNavigation} aria-label="DATA Ledger หน้าแรก" class="flex items-center gap-2">
          <span class="ledger-wordmark">DATA</span>
          <span class="font-mono text-xs text-muted-foreground">/ ledger</span>
          <span class="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">V4</span>
        </a>
        <nav class="ml-4 hidden items-center gap-1 sm:flex" aria-label="เมนูหลัก">
          {#each navItems as item}
            <a href={item.to} use:link onclick={guardNavigation} aria-current={isActive(item.to) ? 'page' : undefined} class="ledger-top-link" class:is-active={isActive(item.to)}>{item.label}</a>
          {/each}
        </nav>
        <div class="ml-auto flex items-center gap-1.5">
          {#if isAdmin}
            <a href="/add" use:link onclick={guardNavigation} class="ledger-top-add hidden sm:inline-flex"><Plus weight="bold" size={14} aria-hidden /> เพิ่มลูกค้า</a>
          {/if}
          <button type="button" onclick={() => setMode(isDark ? 'light' : 'dark')} aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'} class="grid size-11 place-items-center rounded-[10px] border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            {#if isDark}<Sun size={17} aria-hidden />{:else}<Moon size={17} aria-hidden />{/if}
          </button>
          {#if !isAdmin && !signedIn}
            <a href="/login" use:link aria-label="เข้าสู่ระบบผู้ดูแล" class="grid size-11 place-items-center rounded-[10px] border border-border text-muted-foreground hover:bg-muted hover:text-foreground"><LockKey size={17} aria-hidden /></a>
          {:else if isAdmin}
            <span class="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[10px] text-primary sm:block">admin</span>
          {/if}
        </div>
      </div>
    </header>
    {#if offline}
      <div role="status" class="relative z-30 flex shrink-0 items-center justify-center gap-2 border-b border-accent/40 bg-accent/15 px-4 py-2 text-center text-xs text-foreground"><span class="size-1.5 rounded-full bg-accent" aria-hidden="true"></span><b>ออฟไลน์</b> · กำลังแสดงข้อมูลที่บันทึกไว้ การแก้ไขจะส่งเมื่อกลับมาออนไลน์</div>
    {/if}
    <main id="ledger-main" class="ledger-main min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <svelte:boundary onerror={(e) => console.error(e)}>
        <Router {routes} />
        {#snippet failed(error)}
          <div class="p-8 text-sm text-destructive">{(error as Error)?.message ?? 'เกิดข้อผิดพลาด'}</div>
        {/snippet}
      </svelte:boundary>
    </main>
    <nav class="ledger-bottom-nav relative z-50 shrink-0 border-t border-border bg-card" aria-label="หลัก">
      <div class="mx-auto flex h-[4.5rem] max-w-xl items-center justify-around px-3 pb-[env(safe-area-inset-bottom)]">
        <button type="button" onclick={handleHomeClick} aria-label="หน้าหลัก" class="ledger-nav-item" class:is-active={router.location === '/'}><House weight="fill" size={21} aria-hidden /><span>หน้าหลัก</span></button>
        <a href="/maps" use:link onclick={guardNavigation} aria-label="แผนที่" class="ledger-nav-item" class:is-active={router.location === '/maps'}><MapTrifold size={21} aria-hidden /><span>แผนที่</span></a>
        {#if isAdmin}
          <a href="/add" use:link onclick={guardNavigation} aria-label="เพิ่มรายการ" class="ledger-add-button"><Plus weight="bold" size={25} aria-hidden /></a>
        {:else}
          <span aria-label="เพิ่มรายการ" aria-disabled="true" class="ledger-add-button opacity-40 grayscale"><Plus weight="bold" size={25} aria-hidden /></span>
        {/if}
        <a href="/trash" use:link onclick={guardNavigation} aria-label="ถังขยะ" class="ledger-nav-item" class:is-active={router.location === '/trash'}><Trash size={21} aria-hidden /><span>ถังขยะ</span></a>
        <button type="button" onclick={(e) => { guardNavigation(e); if (!e.defaultPrevented) push('/settings') }} aria-label="เมนูและการตั้งค่า" class="ledger-nav-item" class:is-active={router.location === '/settings'}><Gear size={21} aria-hidden /><span>เมนู</span></button>
      </div>
    </nav>
    </div>
    <CommandPalette />
    <UpdatePrompt />
  </div>
{/if}
