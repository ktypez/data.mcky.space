<script lang="ts">
  import { onMount } from 'svelte'
  import Router, { location, link, push } from 'svelte-spa-router'
import wrap from 'svelte-spa-router/wrap'
  import { House, Plus, Gear, MapTrifold, Trash } from 'phosphor-svelte'
  import { useAuthStore } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { isFormDirty } from '@/lib/form-dirty'
  import { appTheme, initAppTheme } from '@/lib/app-theme'
  import { initClerk } from '@/lib/clerk'
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
    const unsub = location.subscribe(() => {
      document.getElementById('ledger-main')?.scrollTo({ top: 0 })
    })
    return () => {
      window.removeEventListener('online', flush)
      unsub()
    }
  })

  function guardNavigation(event: MouseEvent): void {
    if (isFormDirty() && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากฟอร์มไหม?')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const wantsLogin = $derived($location === '/login' || loginOpen)
</script>

{#if wantsLogin && !checking && !signedIn}
  <Login />
{:else}
  <div class="ledger-shell" data-mode={theme.resolvedMode}>
    <a href="#ledger-main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground">ข้ามไปเนื้อหา</a>
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
        <a href="/" use:link onclick={guardNavigation} aria-label="หน้าหลัก" class="ledger-nav-item" class:is-active={$location === '/'} tabindex="0"><House weight="fill" size={21} aria-hidden /><span>หน้าหลัก</span></a>
        <a href="/maps" use:link onclick={guardNavigation} aria-label="แผนที่" class="ledger-nav-item" class:is-active={$location === '/maps'}><MapTrifold size={21} aria-hidden /><span>แผนที่</span></a>
        {#if isAdmin}
          <a href="/add" use:link onclick={guardNavigation} aria-label="เพิ่มรายการ" class="ledger-add-button"><Plus weight="bold" size={25} aria-hidden /></a>
        {:else}
          <span aria-label="เพิ่มรายการ" aria-disabled="true" class="ledger-add-button opacity-40 grayscale"><Plus weight="bold" size={25} aria-hidden /></span>
        {/if}
        <a href="/trash" use:link onclick={guardNavigation} aria-label="ถังขยะ" class="ledger-nav-item" class:is-active={$location === '/trash'}><Trash size={21} aria-hidden /><span>ถังขยะ</span></a>
        <button type="button" onclick={(e) => { guardNavigation(e); if (!e.defaultPrevented) push('/settings') }} aria-label="เมนูและการตั้งค่า" class="ledger-nav-item" class:is-active={$location === '/settings'}><Gear size={21} aria-hidden /><span>เมนู</span></button>
      </div>
    </nav>
    <CommandPalette />
    <UpdatePrompt />
  </div>
{/if}
