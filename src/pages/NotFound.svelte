<script lang="ts">
  import { push } from 'svelte-spa-router'
</script>

<div class="flex h-full min-h-0 flex-col items-center justify-center gap-3 text-center">
  <p class="font-mono text-4xl text-muted-foreground/40">404</p>
  <h1 class="text-lg font-semibold">ไม่พบรายการนี้</h1>
  <button type="button" onclick={() => push('/')} class="min-h-11 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted">กลับหน้าหลัก</button>
</div>
