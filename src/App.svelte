<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, scale } from 'svelte/transition'
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
  import Asterisk from '@/components/ui/Asterisk.svelte'
  import Kbd from '@/components/ui/Kbd.svelte'

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

  // The app's real keyboard shortcuts (also listed in Settings → คีย์ลัด).
  const SHORTCUTS: Array<[string[], string]> = [
    [['/'], 'โฟกัสช่องค้นหา'],
    [['⌘', 'K'], 'เปิดค้นหาด่วน'],
    [['↑', '↓'], 'เลื่อนเลือกรายการ'],
    [['Enter'], 'เปิดระเบียนที่เลือก'],
    [['Esc'], 'ปิดหน้าต่าง / เลื่อนออกจากช่องค้นหา'],
  ]

  let helpOpen = $state(false)

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
  $effect(() => {
    void router.location
    window.scrollTo({ top: 0 })
  })

  // `?` toggles the shortcut sheet, Escape closes it — ignored while typing.
  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable
      if (e.key === '?' && !typing) {
        e.preventDefault()
        helpOpen = !helpOpen
      }
      if (e.key === 'Escape') helpOpen = false
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    <main id="ledger-main" class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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

    <footer class="border-t border-dashed border-rule py-8">
      <p class="flex flex-wrap items-center justify-center gap-2 px-4 text-center text-[11.5px] font-semibold text-ink-faint">
        <Asterisk class="size-3 text-acc" />
        <span>DATA Ledger · Paper Pop — สมุดทะเบียนลูกค้า</span>
        <a
          href="https://github.com/ktypez/data.mcky.space"
          target="_blank"
          rel="noreferrer"
          class="underline decoration-dotted underline-offset-2 hover:text-acc-ink"
        >
          github
        </a>
        <button type="button" class="kbd cursor-pointer hover:text-ink" onclick={() => (helpOpen = true)} aria-label="เปิดคีย์ลัด">?</button>
        <span>สำหรับคีย์ลัด</span>
        <Asterisk class="size-3 text-pop" />
      </p>
    </footer>

    {#if helpOpen}
      <div
        class="fixed inset-0 z-[80] grid place-items-center bg-ink/25 p-4 backdrop-blur-[2px]"
        transition:fade={{ duration: 150 }}
        onmousedown={(e) => {
          if (e.target === e.currentTarget) helpOpen = false
        }}
        role="presentation"
      >
        <div
          class="sticker pop-dots w-full max-w-xs rounded-3xl p-6"
          style="box-shadow: 6px 6px 0 0 var(--hard);"
          role="dialog"
          tabindex="-1"
          aria-label="คีย์ลัดของหนังสือ"
          transition:scale={{ start: 0.9, duration: 220 }}
          onmousedown={(e) => e.stopPropagation()}
        >
          <div class="flex items-center gap-2.5">
            <Asterisk class="size-4 text-acc" />
            <h2 class="text-lg font-extrabold text-ink">คีย์ลัดของหนังสือ</h2>
          </div>
          <ul class="mt-4 space-y-2.5">
            {#each SHORTCUTS as [keys, label]}
              <li class="flex items-center justify-between gap-3">
                <span class="text-[13px] font-medium text-ink-soft">{label}</span>
                <span class="flex gap-1">
                  {#each keys as k}
                    <Kbd>{k}</Kbd>
                  {/each}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  </div>
  <CommandPalette />
  <UpdatePrompt />
  <Toaster />
  <LeaveDialog />
{/if}
