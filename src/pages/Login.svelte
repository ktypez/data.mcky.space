<script lang="ts">
  import { push, querystring } from 'svelte-spa-router'
  import { useAuthStore } from '@/stores/auth-store'

  let isLoaded = $derived(!$useAuthStore.checking)
  let isSignedIn = $derived($useAuthStore.isSignedIn)
  let target = $derived(new URLSearchParams($querystring ?? '').get('redirect') || '/')

  $effect(() => {
    if (isLoaded && isSignedIn) push(target)
    else if (isLoaded && !isSignedIn) {
      window.location.replace(`https://me.mcky.space?from=data&redirect=${encodeURIComponent(target)}`)
    }
  })
</script>

<div style="min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: var(--bg);">
  <div style="color: var(--muted); font-size: 13px">กำลังนำทางไปยังหน้าเข้าสู่ระบบ...</div>
</div>
