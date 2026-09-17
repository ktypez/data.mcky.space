// Check only while the app is in use; background tabs must not poll.
export function startUpdateChecks(registration: ServiceWorkerRegistration): () => void {
  let busy = false
  let stopped = false
  let lastCheck = -Infinity
  const check = async () => {
    if (stopped || busy || registration.installing || !navigator.onLine ||
        document.visibilityState !== 'visible' || Date.now() - lastCheck < 30_000) return
    busy = true
    lastCheck = Date.now()
    try { await registration.update() } catch { /* offline/server failure: retry later */ }
    finally { busy = false }
  }
  const timer = window.setInterval(() => { void check() }, 10 * 60_000)
  window.addEventListener('online', check)
  document.addEventListener('visibilitychange', check)
  void check()
  return () => {
    stopped = true
    window.clearInterval(timer)
    window.removeEventListener('online', check)
    document.removeEventListener('visibilitychange', check)
  }
}

export async function acceptUpdate(
  apply: (reload: boolean) => Promise<void>,
  confirm: () => boolean,
): Promise<void> {
  if (confirm()) await apply(true)
}
