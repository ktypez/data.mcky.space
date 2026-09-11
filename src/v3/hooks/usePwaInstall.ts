import { useEffect, useState, useCallback } from 'react'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document))
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true,
    )

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = () => setIsStandalone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      mq.removeEventListener('change', onChange)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }, [deferred])

  // Show button if: prompt available OR iOS (manual instructions needed), AND not already installed
  const canInstall = !isStandalone && (!!deferred || isIOS)

  return { canInstall, isIOS, install }
}
