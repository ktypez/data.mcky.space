export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

let deferredPrompt: InstallPromptEvent | null = null
let started = false
const listeners = new Set<(prompt: InstallPromptEvent | null) => void>()

function notify() {
  listeners.forEach(listener => listener(deferredPrompt))
}

export function startPwaInstallListener(): void {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function getPwaInstallPrompt(): InstallPromptEvent | null {
  return deferredPrompt
}

export function subscribePwaInstallPrompt(listener: (prompt: InstallPromptEvent | null) => void): () => void {
  listeners.add(listener)
  listener(deferredPrompt)
  return () => { listeners.delete(listener) }
}

export function clearPwaInstallPrompt(): void {
  deferredPrompt = null
  notify()
}
