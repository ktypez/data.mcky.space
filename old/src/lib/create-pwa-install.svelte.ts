import {
  clearPwaInstallPrompt,
  getPwaInstallPrompt,
  subscribePwaInstallPrompt,
  type InstallPromptEvent,
} from '@/lib/pwa-install'

// Svelte 5 runes composable — same contract as the old usePwaInstall hook.
export function createPwaInstall() {
  let deferred = $state<InstallPromptEvent | null>(null)
  let isStandalone = $state(false)
  let isIOS = $state(false)

  function init() {
    const ua = navigator.userAgent
    isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
    isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    const unsubscribePrompt = subscribePwaInstallPrompt((value) => (deferred = value))
    const media = window.matchMedia('(display-mode: standalone)')
    const onChange = () => (isStandalone = media.matches)
    media.addEventListener('change', onChange)
    return () => {
      unsubscribePrompt()
      media.removeEventListener('change', onChange)
    }
  }

  async function install() {
    const prompt = getPwaInstallPrompt()
    if (!prompt) return
    try {
      await prompt.prompt()
      await prompt.userChoice
    } catch {
      // The browser may dismiss the prompt or reject it when the page is backgrounded.
    } finally {
      clearPwaInstallPrompt()
    }
  }

  return {
    init,
    install,
    get canInstall() {
      return !isStandalone && (!!deferred || isIOS)
    },
    get isIOS() {
      return isIOS
    },
  }
}
