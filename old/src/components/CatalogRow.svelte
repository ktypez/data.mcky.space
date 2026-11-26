<script lang="ts">
  import { NotePencil, Image as ImageIcon } from 'phosphor-svelte'
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
  class="prototype-row grid-cols-[40px_minmax(0,1.5fr)_minmax(0,1fr)_96px_34px] {active ? 'is-active' : ''}"
>
  {#if client.images[0]}
    <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={40} height={40} className="row-avatar size-10 rounded-full object-cover" />
  {:else}
    <span aria-hidden="true" class="row-avatar grid size-10 place-items-center rounded-full bg-paper-3 font-bold text-pri">{initial}</span>
  {/if}
  <button type="button" onclick={onOpen} onfocus={onFocus} class="row-names min-w-0 text-left">
    <span class="row-title"><ClientNames {client} variant="list" titleClassName="truncate font-semibold text-ink" subClassName="truncate text-ink-faint" /></span>
  </button>
  <span class="row-status">
    {#if client.badge === 'credit'}<span class="chip border-credit-ink/20 bg-credit-tint text-credit-ink">บัตรเครดิต</span>
    {:else if client.badge === 'penpay'}<span class="chip border-pen-ink/20 bg-pen-tint text-pen-ink">จ่ายในวัน</span>{:else}<span class="chip border-rule bg-paper-3 text-ink-faint">ทั่วไป</span>{/if}
    {#if hasNote}<span class="row-indicator" title="มีโน้ต"><NotePencil size={15} /></span>{/if}
    {#if client.images.length > 0}<span class="row-indicator" title="มีรูป"><ImageIcon size={15} /></span>{/if}
  </span>
  <time class="mono">{formatDate(client.updatedAt)}</time>
  <div class="row-copy" onfocusin={onFocus}>
    <RowCopy {client} focused={active} />
  </div>
</div>

<style>
  .prototype-row { display:grid;align-items:center;gap:14px;min-height:60px;padding:9px 16px;border-bottom:1px solid var(--rule); background:var(--paper-2); transition:background-color var(--mochi-duration-fast) var(--mochi-ease-out); }
  .prototype-row:hover,.prototype-row.is-active { background:color-mix(in srgb,var(--pri) 5%,var(--paper-2)); }
  .prototype-row:last-child { border-bottom:0; }
  .row-avatar { flex:none;overflow:hidden;border:1px solid var(--rule); }
  .row-names { width:100%;padding:0;border:0;background:none;font-size:var(--fs-md); }.row-title :global(span) { display:block; }
  .row-status { display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden; }.row-status .chip { flex:none;white-space:nowrap; }.row-indicator { display:inline-flex;flex:none;color:var(--ink-faint); }
  .prototype-row time { color:var(--ink-faint);font-size:var(--fs-2xs);text-align:right;white-space:nowrap; }
  .row-copy { display:flex;align-items:center;justify-content:center; }.row-copy :global(button) { width:30px;height:30px;min-height:30px;opacity:0; }.prototype-row:hover .row-copy :global(button),.prototype-row:focus-within .row-copy :global(button) { opacity:1; }
  @media(max-width:760px) { .prototype-row { grid-template-columns:40px minmax(0,1fr) 84px 30px;gap:10px;padding:9px 12px; }.row-status { display:none; }.prototype-row time { display:block; } }
</style>
