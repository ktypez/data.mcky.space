<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { MagnifyingGlass, ArrowRight } from 'phosphor-svelte'
  import { useClientStore } from '@/stores/client-store'
  import { clientMatchesQuery } from '@/lib/clientNames'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import NameAvatar from '@/components/NameAvatar.svelte'
  import AppDialog from '@/components/AppDialog.svelte'
  import type { Client } from '@/types/index'
  import { trackField } from '@/lib/restore-field'

  let open = $state(false)
  let query = $state('')
  let focused = $state(0)
  let inputRef: HTMLInputElement
  const readQuery = () => query

  let clients = $derived($useClientStore.clients)
  let loading = $derived($useClientStore.loading)
  let error = $derived($useClientStore.error)

  let filtered = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients.slice(0, 8)
    return clients.filter((c) => clientMatchesQuery(c, q) || c.address.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)).slice(0, 8)
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
  <div class="flex items-center gap-3 border-b border-border px-4">
    <MagnifyingGlass class="h-5 w-5 shrink-0 text-muted-foreground" weight="bold" aria-hidden />
    <input use:trackField={readQuery} bind:this={inputRef} value={query} oninput={(e) => (query = e.currentTarget.value)} onkeydown={onKeyDown} placeholder="พิมพ์ชื่อ ร้าน หรือ ID… — Enter เพื่อเปิด" aria-label="ค้นหาชื่อ ร้าน หรือ ID" class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" autocomplete="off" spellcheck="false" />
    <span class="hidden shrink-0 rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground sm:block">Esc</span>
  </div>

  <div class="max-h-[50vh] overflow-auto p-2" role="listbox" aria-label="ผลการค้นหา">
    {#if loading && clients.length === 0}
      <div class="px-4 py-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดรายการ…</div>
    {:else if error && clients.length === 0}
      <div class="px-4 py-8 text-center text-sm text-destructive" role="alert">โหลดรายการไม่สำเร็จ</div>
    {:else if filtered.length === 0}
      <div class="px-4 py-8 text-center text-sm text-muted-foreground">ไม่พบ “{query}” — ลองคำอื่น</div>
    {:else}
      {#each filtered as client, index}
        <button
          type="button"
          role="option"
          aria-selected={index === focused}
          onfocus={() => (focused = index)}
          onmouseenter={() => (focused = index)}
          onclick={() => onSelect(client)}
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors {index === focused ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
        >
          {#if client.images[0] || client.thumb}
            <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover border border-border" />
          {:else}
            <NameAvatar className={index === focused ? 'ring-2 ring-background' : ''} />
          {/if}
          <span class="min-w-0 flex-1"><ClientNames {client} variant="list" titleClassName="text-sm leading-tight truncate {index === focused ? 'text-primary-foreground' : 'text-foreground'}" subClassName="text-xs truncate {index === focused ? 'text-primary-foreground/60' : 'opacity-60'}" /></span>
          <ArrowRight size={14} class={index === focused ? 'text-primary-foreground/60' : 'text-muted-foreground/40'} weight="bold" aria-hidden />
        </button>
      {/each}
    {/if}
  </div>

  <div class="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 font-mono text-[10px] text-muted-foreground">
    <span class="hidden sm:inline">↑↓ เลือก · Enter เปิด · Esc ปิด</span>
    <span class="sm:hidden">แตะเพื่อเปิด</span>
    <span class="tabular-nums">{filtered.length} รายการ</span>
  </div>
</AppDialog>
