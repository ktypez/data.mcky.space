<script lang="ts">
  import { push, router } from 'svelte-spa-router'
  import { House } from 'phosphor-svelte'
</script>

<div class="mx-auto flex h-full min-h-0 w-full max-w-[440px] flex-col items-center justify-center px-4 text-center">
  <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden="true">
    <rect x="10" y="14" width="100" height="68" rx="12" fill="var(--card)" stroke="var(--border)" stroke-width="2" />
    <path d="M10 34h100" stroke="var(--border)" stroke-width="2" />
    <circle cx="24" cy="24" r="3" fill="var(--border)" /><circle cx="35" cy="24" r="3" fill="var(--border)" /><circle cx="46" cy="24" r="3" fill="var(--border)" />
    <path d="M44 46c0-8 32-8 32 0 0 6-10 6-14 12" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" />
    <circle cx="61" cy="70" r="3" fill="var(--primary)" />
  </svg>
  <p class="mt-4 font-mono text-[13px] tracking-widest text-primary">ข้อผิดพลาด 404</p>
  <h1 class="mt-1.5 text-3xl font-bold tracking-tight">ไม่พบหน้าที่ต้องการ</h1>
  <p class="mt-2.5 text-[15px] leading-7 text-muted-foreground">ลิงก์อาจพิมพ์ผิด หรือระเบียนนี้ถูกลบไปแล้ว ลองกลับไปที่รายการหรือค้นหาใหม่</p>
  <p class="mt-3.5 max-w-full truncate rounded-[10px] bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">#{router.location}</p>
  <div class="mt-6 flex flex-wrap justify-center gap-2">
    <button type="button" onclick={() => push('/')} class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"><House size={17} aria-hidden /> กลับหน้ารายการ</button>
    <button type="button" onclick={() => push('/maps')} class="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-5 text-sm font-medium hover:bg-muted">เปิดแผนที่</button>
  </div>
</div>
