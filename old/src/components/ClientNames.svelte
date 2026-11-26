<script lang="ts">
  import type { Client } from '@/types/index'
  import { branchValue, clientNameValues, clientShopNames, clientTitleValues } from '@/lib/clientNames'
  import OverflowLine from '@/components/OverflowLine.svelte'
  import WrapBetweenFields from '@/components/WrapBetweenFields.svelte'

  let {
    client,
    titleClassName = '',
    subClassName = '',
    branchClassName = '',
    variant = 'list',
  }: {
    client: Pick<Client, 'name' | 'shopName'> & { branch?: string }
    titleClassName?: string
    subClassName?: string
    branchClassName?: string
    variant?: 'list' | 'detail'
  } = $props()

  let names = $derived(clientNameValues(client))
  let branch = $derived(branchValue(client.branch))
</script>

{#if variant === 'detail'}
  <WrapBetweenFields values={clientShopNames(client)} className={titleClassName} />
  <WrapBetweenFields values={branch ? [branch] : []} className={branchClassName} label="สาขา" />
  <WrapBetweenFields values={names} className={subClassName} label="ลูกค้า" />
{:else}
  <OverflowLine values={clientTitleValues(client)} className={titleClassName} />
  {#if names.length > 0}
    <OverflowLine values={names} className={subClassName} />
  {/if}
{/if}
