<script lang="ts">
  import { House } from 'phosphor-svelte'
  let { className = '' }: { className?: string } = $props()
</script>

<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground {className}">
  <House class="h-5 w-5" weight="fill" aria-hidden />
</span>
