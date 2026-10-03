<script lang="ts">
  let { badge, onChange, visible }: { badge: string | null; onChange: (badge: string | null) => void; visible: boolean } = $props()

  const options: { value: string | null; label: string }[] = [
    { value: 'penpay', label: 'จ่ายในวัน' },
    { value: 'credit', label: 'บัตรเครดิต' },
  ]
</script>

{#if visible}
  <fieldset class="space-y-2">
    <legend class="text-sm font-medium">ประเภทชำระ</legend>
    <div class="flex gap-2">
      {#each options as opt}
        {@const active = badge === opt.value}
        <button
          type="button"
          aria-pressed={active}
          onclick={() => onChange(active ? null : opt.value)}
          class="flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors {active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'}"
        >
          {opt.label}
        </button>
      {/each}
    </div>
    {#if badge}
      <p class="text-xs opacity-60">เลือก “{options.find((o) => o.value === badge)?.label}” — กดอีกครั้งเพื่อเอาออก</p>
    {/if}
  </fieldset>
{/if}
