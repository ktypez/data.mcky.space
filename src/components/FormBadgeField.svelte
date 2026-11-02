<script lang="ts">
  let { badge, onChange, visible }: { badge: string | null; onChange: (badge: string | null) => void; visible: boolean } = $props()

  const options: { value: string | null; label: string }[] = [
    { value: 'penpay', label: 'จ่ายในวัน' },
    { value: 'credit', label: 'บัตรเครดิต' },
  ]
</script>

{#if visible}
  <fieldset class="space-y-2">
    <legend class="label !mb-0">ประเภทชำระ</legend>
    <div class="seg w-full" role="group" aria-label="ประเภทชำระ">
      {#each options as opt}
        {@const active = badge === opt.value}
        <button
          type="button"
          aria-pressed={active}
          onclick={() => onChange(active ? null : opt.value)}
          class="seg-item flex-1"
        >
          {#if opt.value === 'credit'}
            <span class="mr-1.5 inline-block size-2 rounded-full align-middle bg-credit" aria-hidden="true"></span>
          {:else if opt.value === 'penpay'}
            <span class="mr-1.5 inline-block size-2 rounded-full align-middle bg-pen" aria-hidden="true"></span>
          {/if}
          {opt.label}
        </button>
      {/each}
    </div>
    {#if badge}
      <p class="text-xs text-ink-faint">เลือก “{options.find((o) => o.value === badge)?.label}” — กดอีกครั้งเพื่อเอาออก</p>
    {/if}
  </fieldset>
{/if}
