<script lang="ts">
  import { NotePencil } from 'phosphor-svelte'
  import type { Client } from '@/types/index'
  import ClientNames from '@/components/ClientNames.svelte'
  import AppImage from '@/components/AppImage.svelte'
  import NameAvatar from '@/components/NameAvatar.svelte'
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
  class="flex min-h-16 w-full items-center border-b border-border {active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}"
>
  <button type="button" onclick={onOpen} onfocus={onFocus} class="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-1.5 text-left">
    {#if client.images[0]}
      <AppImage src={client.thumb ?? client.images[0]} fallbackSrc={client.thumb ? client.images[0] : undefined} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover border border-border" />
    {:else}
      <NameAvatar className={active ? 'ring-2 ring-background' : ''} />
    {/if}
    <span class="min-w-0 flex-1">
      <ClientNames
        {client}
        variant="list"
        titleClassName={`truncate py-0.5 text-sm leading-6 ${active ? 'text-primary-foreground' : 'text-foreground'}`}
        subClassName={`truncate py-0.5 text-xs leading-5 ${active ? 'text-primary-foreground/60' : 'opacity-60'}`}
      />
    </span>
    {#if client.hasNotes || client.notes?.trim()}
      <span class="flex shrink-0 text-destructive" title={client.notes?.trim() || 'มีโน้ต'}>
        <NotePencil size={14} weight="fill" aria-hidden />
        <span class="sr-only">มีโน้ต</span>
      </span>
    {/if}
  </button>
  <div class="pr-3">
    <RowCopy {client} focused={active} />
  </div>
</div>
