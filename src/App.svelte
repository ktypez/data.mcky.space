<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import Router, { router } from 'svelte-spa-router'
  import wrap from 'svelte-spa-router/wrap'
  import { useAuthStore } from '@/stores/auth-store'
  import { useClientStore } from '@/stores/client-store'
  import { appTheme, initAppTheme } from '@/lib/app-theme'
  import { initClerk } from '@/lib/clerk'
  import '@/lib/pwa-install'
  import { flushClientMutations } from '@/lib/offline-mutations'
  import CommandPalette from '@/components/CommandPalette.svelte'
  import UpdatePrompt from '@/components/UpdatePrompt.svelte'
  import LeaveDialog from '@/components/LeaveDialog.svelte'
  import Toaster from '@/components/Toaster.svelte'
  import TopBar from '@/components/TopBar.svelte'

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
  let checking = $derived($useAuthStore.checking)
  let signedIn = $derived($useAuthStore.isSignedIn)
  let loginOpen = $derived($useAuthStore.loginOpen)
  let offline = $derived($useClientStore.offline)

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
  // reset the scroll position in an effect that tracks router.location.
  // <main> is the real scroller (not the window), so reset it too — otherwise
  // the catalog re-opens wherever the previous page was scrolled to.
  $effect(() => {
    void router.location
    window.scrollTo({ top: 0 })
    document.getElementById('ledger-main')?.scrollTo({ top: 0 })
  })

  const wantsLogin = $derived(router.location === '/login' || loginOpen)
</script>

{#if wantsLogin && !checking && !signedIn}
  <Login />
{:else}
  <div class="ledger-shell" data-mode={theme.resolvedMode}>
    <a href="#ledger-main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-ink">ข้ามไปเนื้อหา</a>
    <TopBar />
    {#if offline}
      <div role="status" class="flex shrink-0 items-center justify-center gap-2 border-b border-dashed border-rule bg-tint px-4 py-2 text-center text-[13px] font-semibold text-acc-ink">
        <span class="size-1.5 rounded-full bg-acc" aria-hidden="true"></span>
        <b>ออฟไลน์</b> · กำลังแสดงข้อมูลที่บันทึกไว้ การแก้ไขจะส่งเมื่อกลับมาออนไลน์
      </div>
    {/if}
    <!-- Overscroll chaining must stay at the default here: containing it traps
         the pull gesture in this scroll box, so the browser never sees the
         overscroll and its native pull-to-refresh never fires. Keep this
         element free of any overscroll containment. -->
    <main id="ledger-main" class="min-h-0 flex-1 overflow-y-auto">
      <svelte:boundary onerror={(e) => console.error(e)}>
        {#key router.location}
          <div class="flex h-full min-h-0 flex-col" transition:fade={{ duration: 180 }}>
            <div class="min-h-0 flex-1">
              <Router {routes} />
            </div>
          </div>
        {/key}
        {#snippet failed(error)}
          <div class="p-8 text-sm text-danger-ink">{(error as Error)?.message ?? 'เกิดข้อผิดพลาด'}</div>
        {/snippet}
      </svelte:boundary>
    </main>
  </div>
  <CommandPalette />
  <UpdatePrompt />
  <Toaster />
  <LeaveDialog />
{/if}
