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

<div class="min-h-dvh bg-background text-foreground md:grid md:grid-cols-[1.05fr_1fr]">
  <aside class="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground md:flex">
    <svg class="pointer-events-none absolute inset-0 size-full opacity-[0.14]" aria-hidden="true"><defs><pattern id="login-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="currentColor" /></pattern></defs><rect width="100%" height="100%" fill="url(#login-grid)" /></svg>
    <p class="relative text-lg font-bold tracking-tight">DATA Ledger</p>
    <div class="relative max-w-[420px]">
      <h2 class="text-4xl font-bold leading-tight tracking-tight">สมุดทะเบียนลูกค้า<br />ที่เปิดแล้วใช้ได้ทันที</h2>
      <p class="mt-4 text-[15px] leading-7 opacity-85">ค้นหา แก้ไข และดูตำแหน่งร้านบนแผนที่ ทั้งบนมือถือและเดสก์ท็อป ข้อมูลที่ลบจะอยู่ในถังขยะ 30 วันก่อนหายไปถาวร</p>
    </div>
    <p class="relative font-mono text-[11px] opacity-70">data.mcky.space · V4</p>
  </aside>
  <main class="flex min-h-dvh items-center justify-center px-5 py-8 md:min-h-0">
    <div class="w-full max-w-[400px] rounded-[20px] border border-border bg-card p-6 text-center">
      <p class="flex items-baseline justify-center gap-2 md:hidden"><span class="ledger-wordmark">DATA</span><span class="font-mono text-xs text-muted-foreground">/ ledger</span></p>
      <h1 class="mt-5 text-2xl font-bold tracking-tight md:mt-0">เข้าสู่ระบบ</h1>
      <p class="mt-2 text-sm text-muted-foreground" role="status">กำลังนำทางไปยังหน้าเข้าสู่ระบบผู้ดูแล…</p>
      <a href="#/" class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-medium hover:bg-muted">เข้าชมแบบไม่ล็อกอิน</a>
    </div>
  </main>
</div>
