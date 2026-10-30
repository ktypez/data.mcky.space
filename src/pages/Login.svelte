<script lang="ts">
  import { push, router } from 'svelte-spa-router'
  import { useAuthStore } from '@/stores/auth-store'

  let isLoaded = $derived(!$useAuthStore.checking)
  let isSignedIn = $derived($useAuthStore.isSignedIn)
  let target = $derived(new URLSearchParams(router.querystring ?? '').get('redirect') || '/')

  $effect(() => {
    if (isLoaded && isSignedIn) push(target)
    else if (isLoaded && !isSignedIn) {
      window.location.replace(`https://me.mcky.space?from=data&redirect=${encodeURIComponent(target)}`)
    }
  })
</script>

<div class="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
  <div class="w-full max-w-[400px] rounded-[14px] border border-border bg-card p-8 text-center">
    <p class="flex items-baseline justify-center gap-2"><span class="ledger-wordmark">DATA</span><span class="font-mono text-xs text-muted-foreground">/ ledger</span></p>
    <h1 class="mt-6 text-2xl font-bold tracking-tight">เข้าสู่ระบบ</h1>
    <p class="mt-2 text-sm text-muted-foreground" role="status">กำลังนำทางไปยังหน้าเข้าสู่ระบบผู้ดูแล…</p>
    <p class="mt-6 font-mono text-[11px] text-muted-foreground">data.mcky.space</p>
  </div>
</div>
