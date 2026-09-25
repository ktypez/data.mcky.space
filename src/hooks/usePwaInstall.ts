import { useCallback, useEffect, useState } from 'react'
import {
  clearPwaInstallPrompt,
  getPwaInstallPrompt,
  subscribePwaInstallPrompt,
  type InstallPromptEvent,
} from '@/lib/pwa-install'

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document))
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    )

    const unsubscribePrompt = subscribePwaInstallPrompt(setDeferred)
    const media = window.matchMedia('(display-mode: standalone)')
    const onChange = () => setIsStandalone(media.matches)
    media.addEventListener('change', onChange)
    return () => {
      unsubscribePrompt()
      media.removeEventListener('change', onChange)
    }
  }, [])

  const install = useCallback(async () => {
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
  }, [])

  const canInstall = !isStandalone && (!!deferred || isIOS)
  return { canInstall, isIOS, install }
}
