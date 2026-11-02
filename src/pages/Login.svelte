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

<main class="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center px-4 py-16 sm:py-20">
  <!-- Floating ledger chips — decoration only, md and up. -->
  <span
    class="chip floaty pointer-events-none absolute top-[12%] left-[8%] hidden border-[1.5px] border-acc bg-tint text-acc-ink shadow-[3px_3px_0_0_currentColor] md:block"
    style="--rot: -6deg; animation-delay: 0s"
    aria-hidden="true">+ 1 รายการ</span>
  <span
    class="chip floaty pointer-events-none absolute top-[22%] right-[10%] hidden border-[1.5px] border-pop bg-pop-tint font-mono text-pop-ink shadow-[3px_3px_0_0_currentColor] md:block"
    style="--rot: 4deg; animation-delay: 0.5s"
    aria-hidden="true">M8V7+9Q</span>
  <span
    class="chip floaty pointer-events-none absolute bottom-[26%] left-[12%] hidden border-[1.5px] border-pen bg-pen-tint text-pen-ink shadow-[3px_3px_0_0_currentColor] md:block"
    style="--rot: 5deg; animation-delay: 1s"
    aria-hidden="true">มีโน้ต</span>
  <span
    class="chip floaty pointer-events-none absolute bottom-[16%] right-[8%] hidden border-[1.5px] border-credit bg-credit-tint font-mono text-credit-ink shadow-[3px_3px_0_0_currentColor] md:block"
    style="--rot: -4deg; animation-delay: 0.8s"
    aria-hidden="true">soft delete ♻</span>

  <div class="mb-7 flex items-center justify-center gap-2.5">
    <span class="sticker grid size-9 -rotate-3 place-items-center rounded-xl bg-acc text-white">
      <span class="font-mono text-[13px] font-extrabold tracking-tight">DATA</span>
    </span>
    <span class="flex flex-col leading-none">
      <span class="text-[15px] font-bold tracking-tight text-ink">Ledger</span>
      <svg viewBox="0 0 74 6" class="squiggle mt-1 h-[5px] w-[54px] text-acc" aria-hidden="true" preserveAspectRatio="none">
        <path d="M1 4c6-3.5 8-3.5 14 0s8 3.5 14 0 8-3.5 14 0 8 3.5 14 0 8-3.5 14 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
      </svg>
    </span>
  </div>

  <div class="sticker pop-dots w-full max-w-md rounded-3xl p-8 text-center shadow-[6px_6px_0_0_var(--hard)] sm:p-10">
    <span class="sticker mx-auto grid size-16 place-items-center rounded-2xl bg-acc text-white shadow-[4px_4px_0_0_var(--hard)]" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" class="size-8" aria-hidden="true">
        <path d="M12 3v18M4.3 7.5l15.4 9M19.7 7.5l-15.4 9" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
      </svg>
    </span>
    <h1 class="mt-5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">เข้าสู่ระบบ</h1>
    <svg viewBox="0 0 74 6" class="squiggle mx-auto mt-2 h-[6px] w-28 text-acc" aria-hidden="true" preserveAspectRatio="none">
      <path d="M1 4c6-3.5 8-3.5 14 0s8 3.5 14 0 8-3.5 14 0 8 3.5 14 0 8-3.5 14 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    </svg>
    <p class="mt-3 text-sm leading-relaxed text-ink-soft" role="status">กำลังนำทางไปยังหน้าเข้าสู่ระบบผู้ดูแล…</p>
    <a href="#/" class="btn btn-pop mt-7 w-full min-h-12">เข้าชมแบบไม่ล็อกอิน</a>
  </div>

  <div class="mt-9 max-w-md text-center">
    <h2 class="text-lg font-extrabold leading-tight tracking-tight text-ink sm:text-xl">สมุดทะเบียนลูกค้า<br />ที่เปิดแล้วใช้ได้ทันที</h2>
    <p class="mt-2.5 text-sm leading-7 text-ink-soft">ค้นหา แก้ไข และดูตำแหน่งร้านบนแผนที่ ทั้งบนมือถือและเดสก์ท็อป ข้อมูลที่ลบจะอยู่ในถังขยะ 30 วันก่อนหายไปถาวร</p>
  </div>

  <p class="mt-10 font-mono text-[11px] text-ink-faint">data.mcky.space · Paper Pop</p>
</main>
