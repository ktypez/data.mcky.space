// Kill switch utility for service worker
// Import in any component or use in DevTools console

export function triggerKillSwitch() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        // Send KILL_SW message to the SW
        if (reg.active) {
          reg.active.postMessage({ type: 'KILL_SW' })
        }
        reg.unregister().catch(() => {})
      }
    })
  }
  // Also set localStorage flag for next load
  localStorage.setItem('sw:kill-switch', '1')
  // Force reload
  window.location.reload()
}

// Usage:
// import { triggerKillSwitch } from '@/utils/killSwitch'
// triggerKillSwitch()

// Or in DevTools console:
// triggerKillSwitch()