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
  class="row grid-cols-[minmax(0,1fr)_auto] px-4 sm:px-5 {active ? 'is-active' : ''}"
>
  <button type="button" onclick={onOpen} onfocus={onFocus} class="flex min-w-0 items-center gap-3 py-2 text-left">
    {#if client.images[0]}
      <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl border-[1.5px] border-rule object-cover" />
    {:else}
      <span aria-hidden="true" class="flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-rule bg-tint text-base font-bold text-acc-ink">{initial}</span>
    {/if}
    <span class="min-w-0 flex-1">
      <ClientNames
        {client}
        variant="list"
        titleClassName="truncate py-0.5 text-[14.5px] font-bold leading-6 text-ink"
        subClassName="truncate py-0.5 text-xs leading-5 text-ink-faint"
      />
    </span>
    {#if client.badge === 'credit'}
      <span data-credit="true" title="ประเภทชำระ: บัตรเครดิต" class="chip shrink-0 border-credit-ink/20 bg-credit-tint whitespace-nowrap text-credit-ink">
        <CreditCard size={12} weight="fill" aria-hidden="true" />
        บัตรเครดิต
      </span>
    {:else if client.badge === 'penpay'}
      <span class="chip hidden shrink-0 border-rule bg-paper-2/60 whitespace-nowrap text-ink-faint sm:inline-flex">จ่ายในวัน</span>
    {/if}
    <span class="hidden shrink-0 items-center gap-2 text-ink-faint sm:flex">
      <span class="inline-flex" class:opacity-30={!hasNote} title={hasNote ? (client.notes?.trim() || 'มีโน้ต') : 'ไม่มีโน้ต'}>
        <NotePencil size={16} aria-hidden="true" /><span class="sr-only">{hasNote ? 'มีโน้ต' : 'ไม่มีโน้ต'}</span>
      </span>
      <span class="inline-flex" class:opacity-30={!client.images[0]} title={client.images[0] ? 'มีรูป' : 'ไม่มีรูป'}>
        <ImageIcon size={16} aria-hidden="true" /><span class="sr-only">{client.images[0] ? 'มีรูป' : 'ไม่มีรูป'}</span>
      </span>
    </span>
    <span class="mono hidden w-24 shrink-0 text-right text-xs text-ink-faint md:block">{formatDate(client.updatedAt)}</span>
    {#if hasNote}<span class="sr-only sm:hidden">มีโน้ต</span>{/if}
  </button>
  <div class="flex items-center pr-3">
    <RowCopy {client} focused={active} />
  </div>
</div>
