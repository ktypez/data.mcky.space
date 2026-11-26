<script lang="ts">
  // Payment badge: credit / penpay / none, using the semantic --credit* /
  // --pen* tokens (badged rows keep these colours across palettes).
  let { badge }: { badge: string | null } = $props()
</script>

{#if badge === 'credit'}
  <span class="chip bg-credit-tint text-credit-ink border-credit-ink/20"><span class="size-1.5 rounded-full bg-credit" aria-hidden="true"></span>บัตรเครดิต</span>
{:else if badge === 'penpay'}
  <span class="chip bg-pen-tint text-pen-ink border-pen-ink/20"><span class="size-1.5 rounded-full bg-pen" aria-hidden="true"></span>จ่ายในวัน</span>
{:else}
  <span class="chip border-rule text-ink-faint bg-paper-2/60">—</span>
{/if}
