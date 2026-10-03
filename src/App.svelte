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
    <nav class="ledger-bottom-nav relative z-50 shrink-0" aria-label="หลัก">
      <!-- Liquid-glass refraction for the nav's top edge. Technique ported from
           liquid-glass-svelte (feTurbulence -> feGaussianBlur ->
           feDisplacementMap), rewritten in CSS so there is no runtime script
           from a third party. Browsers without backdrop-filter: url() ignore
           the declaration and keep the plain frosted glass underneath. -->
      <svg aria-hidden="true" focusable="false" width="0" height="0" class="pointer-events-none absolute">
        <filter id="lg-nav-dist" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="42" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div class="flex h-full items-center justify-around px-2">
        <a href="/" use:link onclick={guardNavigation} aria-label="หน้าหลัก" class="ledger-nav-item" class:is-active={$location === '/'} tabindex="0"><House weight="fill" size={21} aria-hidden /><span>หน้าหลัก</span></a>
        <a href="/maps" use:link onclick={guardNavigation} aria-label="แผนที่" class="ledger-nav-item" class:is-active={$location === '/maps'}><MapTrifold size={21} aria-hidden /><span>แผนที่</span></a>
        <a href="/trash" use:link onclick={guardNavigation} aria-label="ถังขยะ" class="ledger-nav-item" class:is-active={$location === '/trash'}><Trash size={21} aria-hidden /><span>ถังขยะ</span></a>
        <button type="button" onclick={(e) => { guardNavigation(e); if (!e.defaultPrevented) push('/settings') }} aria-label="เมนูและการตั้งค่า" class="ledger-nav-item" class:is-active={$location === '/settings'}><Gear size={21} aria-hidden /><span>เมนู</span></button>
        {#if isAdmin}
          <a href="/add" use:link onclick={guardNavigation} aria-label="เพิ่มรายการ" class="ledger-nav-item"><Plus weight="bold" size={21} aria-hidden /><span>เพิ่ม</span></a>
        {:else}
          <span aria-label="เพิ่มรายการ" aria-disabled="true" class="ledger-nav-item ledger-nav-item-disabled"><Plus weight="bold" size={21} aria-hidden /><span>เพิ่ม</span></span>
        {/if}
      </div>
    </nav>
    <CommandPalette />
    <UpdatePrompt />
  </div>
{/if}
