<script lang="ts">
  import { push, router } from 'svelte-spa-router'
  import { fly } from 'svelte/transition'
  import { House } from 'phosphor-svelte'
  import Asterisk from '@/components/ui/Asterisk.svelte'
  import Squiggle from '@/components/ui/Squiggle.svelte'
</script>

<div class="mx-auto flex min-h-0 w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
  <div transition:fly={{ y: 14, duration: 450 }}>
    <span
      class="sticker grid size-20 rotate-3 place-items-center rounded-3xl bg-tint text-acc-ink shadow-[5px_5px_0_0_var(--acc)] floaty"
      style="--rot: 3deg"
      aria-hidden="true"
    >
      <Asterisk class="size-10" />
    </span>
  </div>

  <p class="mt-8 font-mono text-[13px] font-bold tracking-[0.3em] text-ink-faint uppercase">ข้อผิดพลาด 404</p>
  <h1 class="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">ไม่พบหน้าที่ต้องการ</h1>
  <Squiggle class="mt-2 h-[6px] w-36 text-acc" />

  <p class="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">ลิงก์อาจพิมพ์ผิด หรือระเบียนนี้ถูกลบไปแล้ว ลองกลับไปที่รายการหรือค้นหาใหม่</p>
  <p class="mt-3.5 max-w-full truncate rounded-[10px] border border-rule bg-paper-2 px-3 py-1.5 font-mono text-xs text-ink-soft">#{router.location}</p>

  <div class="mt-8 flex flex-wrap justify-center gap-3">
    <button type="button" onclick={() => push('/')} class="btn btn-acc"><House size={17} aria-hidden="true" /> กลับหน้ารายการ</button>
    <button type="button" onclick={() => push('/maps')} class="btn btn-pop">เปิดแผนที่</button>
  </div>
</div>
