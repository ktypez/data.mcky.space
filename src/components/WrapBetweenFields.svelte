<script lang="ts">
  let {
    values,
    className = '',
    label,
  }: { values: string[]; className?: string; label?: string } = $props()
</script>

{#if values.length > 0}
  <div class={className}>
    {#if label}<span>{label} : </span>{/if}
    {#each values as v, i}
      <span>
        {#if i > 0} / {/if}
        <span class="whitespace-normal break-words [overflow-wrap:anywhere]">{v}</span>
      </span>
    {/each}
  </div>
{/if}
