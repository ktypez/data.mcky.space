<script lang="ts">
  import { House } from 'phosphor-svelte'
  let { className = '' }: { className?: string } = $props()
</script>

<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground {className}">
  <House class="h-4 w-4" weight="fill" aria-hidden />
</span>
