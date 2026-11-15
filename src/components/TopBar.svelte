<script lang="ts">
  import { ListBullets, MapTrifold, Trash, Gear, Plus, Sun, Moon, SignIn, SignOut } from 'phosphor-svelte'
  import { push, router } from 'svelte-spa-router'
  import { useAuthStore, logout } from '@/stores/auth-store'
  import { appTheme, setMode } from '@/lib/app-theme'
  import { getClerk } from '@/lib/clerk'
  import { useFilterStore } from '@/stores/filter-store'
  import { FilterKey } from '@/types/index'
  import { isFormDirty, askLeave } from '@/lib/form-dirty'

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

<aside class="v6-sidebar" aria-label="แถบนำทางหลัก">
  <a href="#/" onclick={handleHomeClick} aria-label="DATA Ledger หน้าแรก" class="v6-brand">
    <span class="v6-brand-mark">D</span>
    <span><strong>DATA</strong><small>LEDGER / WORKSPACE</small></span>
  </a>
  <div class="v6-nav-caption">WORKSPACE</div>
  <nav class="v6-nav" aria-label="เมนูหลัก">
    {#each navItems as item}
      <a href={`#${item.to}`} aria-current={isActive(item.to) ? 'page' : undefined} onclick={(e) => guard(e, item.to)} class:active={isActive(item.to)}>
        <item.icon size={19} weight="regular" aria-hidden="true" /><span>{item.label}</span>
        {#if isActive(item.to)}<span class="v6-nav-indicator"></span>{/if}
      </a>
    {/each}
  </nav>
  {#if isAdmin}
    <a href="#/add" onclick={(e) => guard(e, '/add')} class="v6-create"><Plus size={18} weight="bold" /> เพิ่มรายการใหม่</a>
  {/if}
  <div class="v6-sidebar-spacer"></div>
  <div class="v6-sidebar-bottom">
    <button type="button" class="v6-theme" onclick={() => setMode(isDark ? 'light' : 'dark')} aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}>
      {#if isDark}<Sun size={18} />{:else}<Moon size={18} />{/if}<span>{isDark ? 'โหมดมืด' : 'โหมดสว่าง'}</span>
    </button>
    {#if signedIn}
      <div class="v6-account" bind:this={menuRef}>
        <button type="button" class="v6-account-trigger" onclick={() => (menuOpen = !menuOpen)} aria-expanded={menuOpen} aria-haspopup="menu">
          <span class="v6-avatar">{monogram}</span><span class="v6-account-copy"><strong>{account.name || 'บัญชีผู้ใช้'}</strong><small>{isAdmin ? 'Administrator' : 'Signed in'}</small></span><span class="v6-account-more">···</span>
        </button>
        {#if menuOpen}<div role="menu" class="v6-account-menu">{#if account.email}<p>{account.email}</p>{/if}<button type="button" role="menuitem" onclick={() => { menuOpen = false; void logout() }}><SignOut size={16} /> ออกจากระบบ</button></div>{/if}
      </div>
    {:else}
      <button type="button" class="v6-login" onclick={() => push('/login')}><SignIn size={17} /> เข้าสู่ระบบ</button>
    {/if}
  </div>
</aside>
<header class="v6-mobile-header">
  <a href="#/" onclick={handleHomeClick} class="v6-mobile-brand"><span class="v6-brand-mark">D</span><span><strong>DATA</strong><small>LEDGER</small></span></a>
  <div class="v6-mobile-actions">
    <button type="button" class="v6-icon-button" onclick={() => setMode(isDark ? 'light' : 'dark')} aria-label="เปลี่ยนธีม">{#if isDark}<Sun size={19} />{:else}<Moon size={19} />{/if}</button>
    {#if isAdmin}<a href="#/add" class="v6-mobile-add" onclick={(e) => guard(e, '/add')} aria-label="เพิ่มรายการ"><Plus size={20} /></a>{/if}
    {#if signedIn}<button type="button" class="v6-avatar" onclick={() => push('/settings')} aria-label="ไปยังการตั้งค่า">{monogram}</button>{:else}<button type="button" class="v6-icon-button" onclick={() => push('/login')} aria-label="เข้าสู่ระบบ"><SignIn size={19} /></button>{/if}
  </div>
</header>
<nav class="v6-bottom-nav" aria-label="เมนูหลัก">
  {#each navItems as item}
    <a href={`#${item.to}`} aria-current={isActive(item.to) ? 'page' : undefined} onclick={(e) => guard(e, item.to)} class:active={isActive(item.to)}><item.icon size={20} weight="regular" /><span>{item.label}</span></a>
  {/each}
</nav>
[exit status 0]