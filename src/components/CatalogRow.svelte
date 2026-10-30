<script lang="ts">
  import { CreditCard, NotePencil, Image as ImageIcon } from 'phosphor-svelte'
  import type { Client } from '@/types/index'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import { clientTitleValues } from '@/lib/clientNames'
  import { formatDate } from '@/lib/utils'
  import RowCopy from '@/components/RowCopy.svelte'
  import { onMount } from 'svelte'

  let {
    client,
    active,
    index,
    onOpen,
    onFocus,
    style,
    measureElement,
  }: {
    client: Client
    active: boolean
    index: number
    onOpen: () => void
    onFocus: () => void
    style: string
    measureElement: (node: HTMLDivElement | null) => void
  } = $props()

  let initial = $derived((clientTitleValues(client)[0] ?? '?').trim().charAt(0).toUpperCase() || '?')
  let hasNote = $derived(!!(client.hasNotes || client.notes?.trim()))
  let el: HTMLDivElement
  onMount(() => {
    measureElement(el)
    return () => measureElement(null)
  })
</script>

<div
  bind:this={el}
  data-index={index}
  {style}
  role="presentation"
  onmouseenter={onFocus}
  class="flex min-h-16 w-full items-center border-b border-border {active ? 'ledger-row-active' : 'hover:bg-muted/60'}"
>
  <button type="button" onclick={onOpen} onfocus={onFocus} class="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-1.5 text-left sm:px-5">
    {#if client.images[0]}
      <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[10px] object-cover border border-border" />
    {:else}
      <span aria-hidden="true" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-muted text-base font-bold text-primary">{initial}</span>
    {/if}
    <span class="min-w-0 flex-1">
      <ClientNames
        {client}
        variant="list"
        titleClassName="truncate py-0.5 text-sm font-semibold leading-6 text-foreground"
        subClassName="truncate py-0.5 text-xs leading-5 text-muted-foreground"
      />
    </span>
    {#if client.badge === 'credit'}
      <span data-credit="true" title="ประเภทชำระ: บัตรเครดิต" class="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-xs font-semibold leading-none text-primary-foreground">
        <CreditCard size={12} weight="fill" aria-hidden />
        บัตรเครดิต
      </span>
    {:else if client.badge === 'penpay'}
      <span class="hidden shrink-0 whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-xs font-semibold leading-none text-muted-foreground sm:inline-flex">จ่ายในวัน</span>
    {/if}
    <span class="hidden shrink-0 items-center gap-2 text-muted-foreground sm:flex">
      <span class="inline-flex" class:opacity-30={!hasNote} title={hasNote ? (client.notes?.trim() || 'มีโน้ต') : 'ไม่มีโน้ต'}>
        <NotePencil size={16} aria-hidden /><span class="sr-only">{hasNote ? 'มีโน้ต' : 'ไม่มีโน้ต'}</span>
      </span>
      <span class="inline-flex" class:opacity-30={!client.images[0]} title={client.images[0] ? 'มีรูป' : 'ไม่มีรูป'}>
        <ImageIcon size={16} aria-hidden /><span class="sr-only">{client.images[0] ? 'มีรูป' : 'ไม่มีรูป'}</span>
      </span>
    </span>
    <span class="hidden w-24 shrink-0 text-right font-mono text-xs text-muted-foreground md:block">{formatDate(client.updatedAt)}</span>
    {#if hasNote}<span class="sr-only sm:hidden">มีโน้ต</span>{/if}
  </button>
  <div class="pr-3">
    <RowCopy {client} focused={active} />
  </div>
</div>
