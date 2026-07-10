'use client'

import { useEffect, useState, useCallback } from 'react'
import { Monitor } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'ezzylist_pwa_dismissed'
const VISITS_KEY = 'ezzylist_pwa_visits'
const MIN_VISITS = 2
const SHOW_DELAY_MS = 5000

export default function PwaInstallAlert() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [ready, setReady] = useState(false)
  const isClient = typeof window !== 'undefined'
  const isStandalone =
    isClient &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)

  const [dismissed, setDismissed] = useState(
    () => isClient && localStorage.getItem(DISMISS_KEY) === 'true',
  )
  const isIOS = isClient && /iPad|iPhone|iPod/.test(navigator.userAgent)

  useEffect(() => {
    if (!isClient || dismissed || isStandalone) return

    const raw = localStorage.getItem(VISITS_KEY)
    const visits = raw ? parseInt(raw, 10) || 0 : 0
    const next = visits + 1
    localStorage.setItem(VISITS_KEY, String(next))

    if (next >= MIN_VISITS) {
      const timer = setTimeout(() => setReady(true), SHOW_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [isClient, dismissed, isStandalone])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    const onInstalled = () => setDismissed(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismissForever = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    const promptEvent = deferredPrompt as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setDismissed(true)
    } else {
      dismissForever()
    }
  }, [deferredPrompt, dismissForever])

  if (isStandalone || dismissed || !ready || (!isIOS && !deferredPrompt)) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[2000] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[var(--card)] rounded-xl p-4 flex items-center gap-3 shadow-lg max-w-sm mx-auto">
        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--destructive)]/20 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-[var(--destructive)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isIOS ? 'เพิ่ม ClientData ที่หน้าจอโฮม' : 'ติดตั้งแอป ClientData'}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {isIOS
              ? 'แตะแชร์ '
              : deferredPrompt
              ? 'ติดตั้งไว้ที่หน้าจอโฮมเพื่อใช้ได้ทันที'
              : 'เปิดเมนูเบราว์เซอร์ > เพิ่มไปที่หน้าจอโฮม'}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button variant="secondary" size="sm" onClick={dismissForever}>
            {isIOS ? 'ปิด' : 'ไม่ตอนนี้'}
          </Button>
          {deferredPrompt && (
            <Button variant="destructive" size="sm" onClick={handleInstall}>
              ติดตั้ง
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
