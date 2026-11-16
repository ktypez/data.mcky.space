<script lang="ts">
  import { ListBullets, MapTrifold, Trash, Gear, Plus, Sun, Moon, SignIn, SignOut } from 'phosphor-svelte'
  import { push, router } from 'svelte-spa-router'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { appTheme, setMode } from '@/lib/app-theme'
  import { getClerk } from '@/lib/clerk'
  import { useFilterStore } from '@/stores/filter-store'
  import { FilterKey } from '@/types/index'
  import { isFormDirty, askLeave } from '@/lib/form-dirty'
  import Squiggle from '@/components/ui/Squiggle.svelte'

  let theme = $derived($appTheme)
  let isAdmin = $derived($useAuthStore.isAdmin)
  let signedIn = $derived($useAuthStore.isSignedIn)
  let isDark = $derived(theme.resolvedMode === 'dark')

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

<header class="sticky top-0 z-50 border-b-[1.5px] border-ink bg-paper">
  <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
    <a href="#/" onclick={handleHomeClick} aria-label="DATA Ledger หน้าแรก" class="group flex items-center gap-2.5">
      <span class="sticker grid size-9 -rotate-3 place-items-center rounded-xl bg-acc text-white transition-transform duration-200 group-hover:-rotate-6" aria-hidden="true">
        <span class="font-mono text-[13px] font-extrabold tracking-tight">DATA</span>
      </span>
      <span class="flex flex-col leading-none">
        <span class="text-[15px] font-bold tracking-tight text-ink">Ledger</span>
        <Squiggle class="mt-1 h-[5px] w-[54px] text-acc" />
      </span>
    </a>

    <nav class="hidden items-center gap-1 sm:flex" aria-label="เมนูหลัก">
      {#each navItems as item}
        <a
          href={`#${item.to}`}
          aria-current={isActive(item.to) ? 'page' : undefined}
          onclick={(e) => guard(e, item.to)}
          class="flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-semibold whitespace-nowrap transition-all duration-150 {isActive(item.to)
            ? 'border-[1.5px] border-ink bg-acc-tint text-acc-ink shadow-[2.5px_2.5px_0_0_var(--acc)]'
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
          เพิ่มรายการ
        </a>
      {/if}
    </nav>

    <div class="flex items-center gap-2.5">
      <button
        type="button"
        onclick={() => setMode(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
        class="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-card text-ink-soft shadow-[2px_2px_0_0_var(--hard)] transition-all hover:-translate-y-px hover:text-ink"
      >
        {#if isDark}<Sun size={17} weight="bold" aria-hidden="true" />{:else}<Moon size={17} weight="bold" aria-hidden="true" />{/if}
      </button>

      {#if signedIn}
        <div class="relative" bind:this={menuRef}>
          <button
            type="button"
            onclick={() => (menuOpen = !menuOpen)}
            class="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-[1.5px] border-ink bg-acc font-mono text-[14px] font-bold text-white shadow-[2px_2px_0_0_var(--hard)] transition-transform hover:-translate-y-px"
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

  <nav class="flex gap-1 overflow-x-auto px-4 pb-2.5 sm:hidden" aria-label="เมนูหลัก">
    {#each navItems as item}
      <a
        href={`#${item.to}`}
        aria-current={isActive(item.to) ? 'page' : undefined}
        onclick={(e) => guard(e, item.to)}
        class="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-semibold whitespace-nowrap transition-all duration-150 {isActive(item.to)
          ? 'border-[1.5px] border-ink bg-acc-tint text-acc-ink shadow-[2.5px_2.5px_0_0_var(--acc)]'
          : 'text-ink-soft hover:bg-paper-2 hover:text-ink'}"
      >
        <item.icon size={15} weight="bold" aria-hidden="true" />
        {item.label}
      </a>
    {/each}
    {#if isAdmin}
      <a href="#/add" onclick={(e) => guard(e, '/add')} class="btn btn-acc shrink-0 !px-3.5 !py-2 text-[13px]">
        <Plus size={15} weight="bold" aria-hidden="true" />
        เพิ่มรายการ
      </a>
    {/if}
  </nav>
</header>
