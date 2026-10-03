<script lang="ts">
  import { Warning } from 'phosphor-svelte'
  import Label from '@/components/ui/Label.svelte'
  import MultiValueInput from '@/components/MultiValueInput.svelte'
  import type { DuplicateResult } from '@/lib/duplicate-names'
  import { clientTitle, clientSubNames } from '@/lib/clientNames'

  let {
    values,
    onChange,
    dupResult,
    autoFocus,
    inlineAdd,
  }: {
    values: string[]
    onChange: (values: string[]) => void
    dupResult: DuplicateResult
    autoFocus?: boolean
    inlineAdd?: boolean
  } = $props()

  let hasConflict = $derived(!!(dupResult.exact || dupResult.similar.length > 0))
</script>

<div class="space-y-1">
  <Label>ชื่อลูกค้า</Label>
  <MultiValueInput {values} {onChange} placeholder="ชื่อลูกค้า" maxLength={40} addLabel="เพิ่มชื่อ" variant={hasConflict ? 'error' : 'default'} {autoFocus} {inlineAdd} />
  {#if hasConflict}
    <div class="flex items-start gap-2 py-2 px-3 rounded-[6px] bg-destructive/10 border border-destructive/40 text-[13px] text-destructive">
      <Warning class="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span class="leading-relaxed">
        {#if dupResult.exact}
          มีชื่อ “{clientTitle(dupResult.exact)}” อยู่แล้ว
          {clientSubNames(dupResult.exact) ? ` (${clientSubNames(dupResult.exact)})` : ''}
        {:else if dupResult.similar.length > 0}
          ชื่อคล้าย: {dupResult.similar.map((m) => `${clientTitle(m.client)}${clientSubNames(m.client) ? ` (${clientSubNames(m.client)})` : ''}`).join(', ')}
        {/if}
      </span>
    </div>
  {/if}
</div>
