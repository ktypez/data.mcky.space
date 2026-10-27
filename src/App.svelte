<script lang="ts">
  import { onMount } from 'svelte'
  import Router, { router, link } from 'svelte-spa-router'
  import wrap from 'svelte-spa-router/wrap'
  import { House, Plus, Gear, MapTrifold, Trash, Database, Sun, Moon, Lock } from 'phosphor-svelte'
  import { useAuthStore } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { isFormDirty } from '@/lib/form-dirty'
  import { appTheme, initAppTheme, setMode } from '@/lib/app-theme'
  import { initClerk } from '@/lib/clerk'
  import '@/lib/pwa-install'
  import { flushClientMutations } from '@/lib/offline-mutations'
  import CommandPalette from '@/components/CommandPalette.svelte'
  import UpdatePrompt from '@/components/UpdatePrompt.svelte'
  import '@/styles/ledger.css'

  import Login from './pages/Login.svelte'

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

  function guardNavigation(event: MouseEvent): void {
    if (isFormDirty() && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากฟอร์มไหม?')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function toggleMode() {
    setMode(theme.resolvedMode === 'dark' ? 'light' : 'dark')
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

  $effect(() => {
    void router.location
    document.getElementById('ledger-main')?.scrollTo({ top: 0 })
  })

  const navItems = [
    { to: '/', label: 'รายการ', Icon: House },
    { to: '/maps', label: 'แผนที่', Icon: MapTrifold },
    { to: '/trash', label: 'ถังขยะ', Icon: Trash },
    { to: '/settings', label: 'ตั้งค่า', Icon: Gear },
  ]

  const showFab = $derived(
    isAdmin && (router.location === '/' || router.location === '/maps' || router.location === '/trash')
  )

  const wantsLogin = $derived(router.location === '/login' || loginOpen)
</script>

{#if wantsLogin && !checking && !signedIn}
  <Login />
{:else}
  <div class="ledger-shell" data-mode={theme.resolvedMode}>
    <a href="#ledger-main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground">ข้ามไปเนื้อหา</a>

    <!-- Header (proto: sticky top, backdrop-blur) -->
    <header class="sticky top-0 z-30 shrink-0 border-b border-border bg-card/85 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3 sm:px-4">
        <a href="/" use:link onclick={guardNavigation} class="flex items-center gap-2" aria-label="DATA Ledger หน้าแรก">
          <span class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Database size={17} weight="fill" />
          </span>
          <span class="leading-none">
            <span class="block font-display text-sm font-semibold tracking-tight">DATA Ledger</span>
            <span class="block font-mono text-[10px] text-muted-foreground">data.mcky.space · V3</span>
          </span>
        </a>

        <nav class="ml-4 hidden items-center gap-1 sm:flex" aria-label="เมนูหลัก">
          {#each navItems as n}
            {@const active = n.to === '/' ? router.location === '/' : router.location.startsWith(n.to)}
            <a href={n.to} use:link onclick={guardNavigation} aria-current={active ? 'page' : undefined} class="rounded-lg px-2.5 py-1.5 text-xs transition-colors {active ? 'bg-primary/12 font-medium text-primary' : 'text-muted-foreground hover:bg-muted'}">{n.label}</a>
          {/each}
        </nav>

        <div class="ml-auto flex items-center gap-1.5">
          <button type="button" onclick={toggleMode} aria-label={theme.resolvedMode === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'} class="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            {#if theme.resolvedMode === 'dark'}<Sun size={17} />{:else}<Moon size={17} />{/if}
          </button>
          {#if isAdmin}
            <span class="hidden rounded-full bg-primary/12 px-2.5 py-1 text-[10px] text-primary sm:block">admin</span>
          {:else}
            <a href="/login" use:link onclick={guardNavigation} class="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="เข้าสู่ระบบผู้ดูแล">
              <Lock size={17} />
            </a>
          {/if}
        </div>
      </div>
    </header>

    <main id="ledger-main" class="ledger-main min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <svelte:boundary onerror={(e) => console.error(e)}>
        <Router {routes} />
        {#snippet failed(error)}
          <div class="p-8 text-sm text-destructive">{(error as Error)?.message ?? 'เกิดข้อผิดพลาด'}</div>
        {/snippet}
      </svelte:boundary>
    </main>

    <!-- FAB (proto: fixed bottom-right on /, /maps, /trash) -->
    {#if showFab}
      <a href="/add" use:link onclick={guardNavigation} aria-label="เพิ่มระเบียนใหม่" class="fixed bottom-20 right-4 z-30 grid size-13 place-items-center rounded-2xl bg-primary p-3.5 text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:bottom-6 sm:right-6">
        <Plus weight="bold" size={24} />
      </a>
    {/if}

    <!-- Bottom nav (proto: 4 items, mobile only) -->
    <nav class="ledger-bottom-nav relative z-50 shrink-0 border-t border-border bg-card" aria-label="หลัก">
      <div class="mx-auto flex h-[4.5rem] max-w-xl items-center justify-around px-3 pb-[env(safe-area-inset-bottom)]">
        {#each navItems as n}
          {@const active = n.to === '/' ? router.location === '/' : router.location.startsWith(n.to)}
          <a href={n.to} use:link onclick={guardNavigation} aria-label={n.label} class="ledger-nav-item" class:is-active={active}>
            <svelte:component this={n.Icon} weight={active ? 'fill' : 'regular'} size={21} aria-hidden />
            <span>{n.label}</span>
          </a>
        {/each}
      </div>
    </nav>

    <CommandPalette />
    <UpdatePrompt />
  </div>
{/if}