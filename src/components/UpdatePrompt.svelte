<script lang="ts">
  import { onMount } from 'svelte'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import { acceptUpdate, rememberRegistration, startUpdateChecks } from '@/lib/pwa-update'

  let registration: ServiceWorkerRegistration | undefined = $state()
  let error = $state(false)
  let applying = $state(false)

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url: string, reg: ServiceWorkerRegistration | undefined) {
      registration = reg
      if (reg) rememberRegistration(reg)
    },
    onRegisterError() {
      /* Online app remains usable if SW is unavailable. */
    },
  })

  onMount(() => {
    // needRefresh store subscription is handled by the PWA module itself.
  })

  $effect(() => {
    if (registration) return startUpdateChecks(registration)
  })

  let showUpdate = $derived($needRefresh)
</script>

{#if showUpdate}
  <aside
    role="status"
    aria-live="polite"
    style="position: fixed; bottom: max(20px, env(safe-area-inset-bottom)); left: 16px; right: 16px; z-index: 10000; margin: auto; max-width: 480px; padding: 16px; border-radius: 12px; color: #fff; background: #24242c; box-shadow: 0 4px 24px #0006"
  >
    <strong>มีเวอร์ชันใหม่พร้อมใช้งาน</strong>
    <p style="margin: 8px 0; font-size: 14px">บันทึกงานในทุกแท็บก่อนอัปเดต หรือใช้งานต่อแล้วค่อยกดภายหลัง</p>
    <button
      disabled={applying}
      style="padding: 8px 16px; border-radius: 8px; background: #fff; color: #24242c; cursor: pointer"
      onclick={async () => {
        error = false
        try {
          await acceptUpdate(async (reload) => {
            applying = true
            await updateServiceWorker(reload)
          }, () => window.confirm('บันทึกงานทุกแท็บแล้วหรือยัง? อัปเดตจะโหลดหน้านี้ใหม่'))
        } catch {
          error = true
          applying = false
        }
      }}
    >
      {applying ? 'กำลังอัปเดต…' : 'อัปเดตและรีเฟรช'}
    </button>
    {#if error}
      <p role="alert">อัปเดตไม่สำเร็จ ลองใหม่เมื่อเชื่อมต่ออินเทอร์เน็ต</p>
    {/if}
  </aside>
{/if}
