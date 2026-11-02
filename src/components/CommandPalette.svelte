<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { MagnifyingGlass, ArrowRight, Plus, Sun, Moon } from 'phosphor-svelte'
  import { useAuthStore } from '@/stores/auth-store'
  import { appTheme, setMode } from '@/lib/app-theme'
  import { useClientStore } from '@/stores/client-store'
  import { clientSearchText, tokenizeQuery } from '@/lib/clientNames'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import Monogram from '@/components/ui/Monogram.svelte'
  import AppDialog from '@/components/AppDialog.svelte'
  import type { Client } from '@/types/index'
  import { trackField } from '@/lib/restore-field'

  let open = $state(false)
  let query = $state('')
  let focused = $state(0)
  let inputRef: HTMLInputElement
  const readQuery = () => query

  let clients = $derived($useClientStore.clients)
  let isAdmin = $derived($useAuthStore.isAdmin)
  let dark = $derived($appTheme.resolvedMode === 'dark')
  let loading = $derived($useClientStore.loading)
  let error = $derived($useClientStore.error)

  let filtered = $derived.by(() => {
    const tokens = tokenizeQuery(query)
    if (tokens.length === 0) return clients.slice(0, 8)
    return clients
      .filter((c) => {
        const text = clientSearchText(c)
        return tokens.every((k) => text.includes(k))
      })
      .slice(0, 8)
  })

  $effect(() => {
    query
    open
    focused = 0
  })

  $effect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
      const target = event.target
      const isTextEntry = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !isTextEntry
      if (isK) {
        event.preventDefault()
        open = !open
      } else if (isSlash) {
        event.preventDefault()
        open = true
      } else if (event.key === 'Escape' && open) {
        open = false
      }
    }
    const onOpenEvent = () => (open = true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', onOpenEvent)
    }
  })

  $effect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => inputRef?.focus(), 10)
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      query = ''
    }
  })

  const commands = $derived(
    [
      ...(isAdmin ? [{ label: 'เพิ่มระเบียนใหม่', hint: 'N', icon: Plus, run: () => push('/add') }] : []),
      { label: dark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด', hint: 'D', icon: dark ? Sun : Moon, run: () => setMode(dark ? 'light' : 'dark') },
    ].filter((c) => !query.trim() || c.label.includes(query.trim())),
  )

  function onSelect(client: Client) {
    open = false
    push(`/c/${encodeURIComponent(client.id)}`)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' && filtered.length > 0) {
      event.preventDefault()
      focused = Math.min(focused + 1, filtered.length - 1)
    } else if (event.key === 'ArrowUp' && filtered.length > 0) {
      event.preventDefault()
      focused = Math.max(focused - 1, 0)
    } else if (event.key === 'Enter' && filtered[focused]) {
      event.preventDefault()
      onSelect(filtered[focused])
    }
  }
</script>

<AppDialog {open} onClose={() => (open = false)} title="ค้นหา" showHeader={false} panelClassName="max-w-xl overflow-hidden">
  <div class="flex items-center gap-3 border-b border-dashed border-rule px-4">
    <MagnifyingGlass class="h-5 w-5 shrink-0 text-ink-faint" weight="bold" aria-hidden="true" />
    <input use:trackField={readQuery} bind:this={inputRef} value={query} oninput={(e) => (query = e.currentTarget.value)} onkeydown={onKeyDown} placeholder="พิมพ์ชื่อ ร้าน หรือ ID… — Enter เพื่อเปิด" aria-label="ค้นหาชื่อ ร้าน หรือ ID" class="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" autocomplete="off" spellcheck="false" />
    <span class="hidden shrink-0 sm:block"><kbd class="kbd">Esc</kbd></span>
  </div>

  <div class="max-h-[50vh] overflow-auto p-2" role="listbox" aria-label="ผลการค้นหา">
    {#if loading && clients.length === 0}
      <div class="px-4 py-8 text-center text-sm text-ink-soft" role="status">กำลังโหลดรายการ…</div>
    {:else if error && clients.length === 0}
      <div class="px-4 py-8 text-center text-sm text-danger-ink" role="alert">โหลดรายการไม่สำเร็จ</div>
    {:else if filtered.length === 0}
      <div class="px-4 py-8 text-center text-sm text-ink-soft">ไม่พบ “{query}” — ลองคำอื่น</div>
    {:else}
      {#each filtered as client, index}
        <button
          type="button"
          role="option"
          aria-selected={index === focused}
          onfocus={() => (focused = index)}
          onmouseenter={() => (focused = index)}
          onclick={() => onSelect(client)}
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors {index === focused ? 'bg-tint text-ink shadow-[inset_3px_0_0_0_var(--acc)]' : 'hover:bg-paper-2'}"
        >
          {#if client.images[0] || client.thumb}
            <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover border border-rule" />
          {:else}
            <Monogram name={client.shopName[0] || client.name[0] || '?'} size={32} />
          {/if}
          <span class="min-w-0 flex-1"><ClientNames {client} variant="list" titleClassName="text-sm leading-tight truncate text-ink" subClassName="text-xs truncate text-ink-soft" /></span>
          <ArrowRight size={14} class={index === focused ? 'text-acc-ink' : 'text-ink-faint'} weight="bold" aria-hidden="true" />
        </button>
      {/each}
    {/if}
    {#if commands.length > 0}
      <p class="px-3 pt-3 pb-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase">คำสั่ง</p>
      {#each commands as cmd}
        <button type="button" onclick={() => { open = false; cmd.run() }} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-ink hover:bg-paper-2">
          <cmd.icon size={16} aria-hidden class="text-ink-soft" />
          <span class="flex-1">{cmd.label}</span>
          <kbd class="kbd">{cmd.hint}</kbd>
        </button>
      {/each}
    {/if}
  </div>

  <div class="flex items-center justify-between border-t border-dashed border-rule bg-paper-2/40 px-4 py-2 font-mono text-[10px] text-ink-faint">
    <span class="hidden sm:inline">↑↓ เลือก · Enter เปิด · Esc ปิด</span>
    <span class="sm:hidden">แตะเพื่อเปิด</span>
    <span class="tabular-nums">{filtered.length} รายการ</span>
  </div>
</AppDialog>
