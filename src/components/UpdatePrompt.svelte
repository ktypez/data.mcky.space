<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import { ArrowClockwise } from 'phosphor-svelte'
  import { acceptUpdate, rememberRegistration, startUpdateChecks } from '@/lib/pwa-update'
  import { isFormDirty } from '@/lib/form-dirty'
  import Button from '@/components/ui/Button.svelte'

  let registration: ServiceWorkerRegistration | undefined = $state()
  let error = $state(false)
  let applying = $state(false)
  let cardRef: HTMLDivElement | undefined = $state()

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url: string, reg: ServiceWorkerRegistration | undefined) {
      registration = reg
      if (reg) rememberRegistration(reg)
    },
    onRegisterError() {
      /* Online app remains usable if SW is unavailable. */
    },
  })

  $effect(() => {
    if (registration) return startUpdateChecks(registration)
  })

  let showUpdate = $derived($needRefresh)

  // Focus the primary action so the dialog is usable from the keyboard alone,
  // and Escape always means "later" rather than "stuck".
  $effect(() => {
    if (!showUpdate) return
    const previous = document.activeElement as HTMLElement | null
    const timer = setTimeout(() => {
      cardRef?.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus()
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  })

  function dismiss() {
    needRefresh.set(false)
  }

  async function apply() {
    error = false
    try {
      await acceptUpdate(
        async (reload) => {
          applying = true
          await updateServiceWorker(reload)
        },
        // Only interrupt when a form actually holds unsaved edits; otherwise
        // the reload is harmless and asking is just noise.
        () => !isFormDirty() || window.confirm('มีข้อมูลที่ยังไม่บันทึก อัปเดตจะโหลดหน้านี้ใหม่ ต่อไหม?'),
      )
    } catch {
      error = true
      applying = false
    }
  }
</script>

{#if showUpdate}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[10000] grid place-items-center bg-foreground/45 px-4 backdrop-blur-[2px]"
    onclick={(e) => {
      if (e.target === e.currentTarget && !applying) dismiss()
    }}
  >
    <div
      bind:this={cardRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-title"
      aria-describedby="update-body"
      class="w-full max-w-[20rem] rounded-3xl border border-border bg-card p-6 text-center shadow-2xl shadow-black/20"
    >
      <span class="mx-auto grid size-10 place-items-center rounded-full bg-primary/12 text-primary">
        <ArrowClockwise class="size-5" weight="bold" aria-hidden />
      </span>
      <h2 id="update-title" class="mt-3 text-base font-semibold text-foreground">มีเวอร์ชันใหม่</h2>
      <p id="update-body" class="mt-1 text-sm text-muted-foreground">บันทึกงานที่ค้างไว้ก่อน</p>

      {#if error}
        <p class="mt-3 text-xs text-destructive" role="alert">อัปเดตไม่สำเร็จ ลองใหม่เมื่อมีอินเทอร์เน็ต</p>
      {/if}

      <div class="mt-5 flex gap-2">
        <Button class="flex-1" variant="ghost" onclick={dismiss} disabled={applying}>ภายหลัง</Button>
        <Button data-autofocus data-update-apply class="flex-1" variant="default" onclick={apply} disabled={applying}>
          {applying ? 'กำลังอัปเดต…' : 'อัปเดต'}
        </Button>
      </div>
    </div>
  </div>
{/if}
