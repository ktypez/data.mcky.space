import { useEffect, useRef, useState } from 'react'
import { ArrowsClockwise, DownloadSimple, LockKey, Monitor, Moon, SignOut, Sun } from '@phosphor-icons/react'
import { SyncStatus } from '@/components/SyncStatus'
import AppThemePicker from '@/components/AppThemePicker'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { useAuthStore, logout } from '@/stores/auth-store'
import { manuallyUpdateApp, getRememberedRegistration } from '@/lib/pwa-update'
import { getTheme } from '@/lib/design/themes'
import { themeSupportsMode, type AppMode, type CustomPalette } from '@/lib/app-theme'

type Props = {
  mode: AppMode
  setMode: (mode: AppMode) => void
  themeId: string
  setThemeId: (themeId: string) => void
  customPalette: CustomPalette
  setCustomPalette: (palette: CustomPalette) => void
}

export default function SettingsPage({ mode, setMode, themeId, setThemeId, customPalette, setCustomPalette }: Props) {
  const { isSignedIn, setLoginOpen } = useAuthStore()
  const { canInstall, isIOS, install } = usePwaInstall()
  const [appUpdateState, setAppUpdateState] = useState<'idle' | 'checking' | 'latest' | 'error'>('idle')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedTheme = getTheme(themeId)

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
  }, [])

  const finishUpdateCheck = (next: 'latest' | 'error') => {
    setAppUpdateState(next)
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => setAppUpdateState('idle'), 2200)
  }

  const checkForAppUpdate = async () => {
    setAppUpdateState('checking')
    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    try {
      const result = await Promise.race([
        manuallyUpdateApp(getRememberedRegistration()),
        timeout(10000),
      ])
      if (result === 'latest') finishUpdateCheck('latest')
    } catch {
      finishUpdateCheck('error')
    }
  }

  return (
    <section className="mx-auto max-w-xl px-5 pb-8 pt-6 sm:px-6">
      <h1 className="sr-only">เมนูและการตั้งค่า</h1>
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">การซิงค์ข้อมูล</h2>
          <SyncStatus />
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">ธีม</h2>
          <AppThemePicker
            themeId={themeId}
            setThemeId={setThemeId}
            customPalette={customPalette}
            setCustomPalette={setCustomPalette}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">โหมดสี</h2>
            <span className="font-mono text-xs text-muted-foreground">{selectedTheme.label}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="เลือกโหมดสี">
            {(['auto', 'light', 'dark'] as const).map((item) => {
              const label = item === 'auto' ? 'ตามระบบ' : item === 'light' ? 'สว่าง' : 'มืด'
              const supported = themeSupportsMode(selectedTheme, item)
              const description = supported
                ? item === 'auto' ? 'ใช้ค่าจากเครื่อง' : item === 'light' ? 'พื้นหลังสว่าง' : 'พื้นหลังมืด'
                : `ธีมนี้ไม่รองรับ${item === 'light' ? 'สว่าง' : 'มืด'}`
              const Icon = item === 'auto' ? Monitor : item === 'light' ? Sun : Moon
              const active = mode === item || (mode === 'auto' && selectedTheme.modes?.length === 1 && selectedTheme.modes[0] === item)
              return (
                <button key={item} type="button" role="radio" aria-checked={active} onClick={() => setMode(item)} disabled={!supported} aria-label={`ใช้โหมด${label}`} className={`flex min-h-[76px] items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:block sm:min-h-[92px] ${active ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'}`}>
                  <Icon size={20} weight={active ? 'fill' : 'regular'} className="shrink-0 sm:mb-2" aria-hidden />
                  <span className="block"><span className="block text-sm font-medium">{label}{active && <span className="ml-1 text-primary">✓</span>}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">แอปและบัญชี</h2>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">DATA Ledger · V3</span>
          </div>
          <div className="space-y-1">
            {canInstall && <button type="button" onClick={() => isIOS ? undefined : void install()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><DownloadSimple size={18} aria-hidden /> ติดตั้งแอป{isIOS && <span className="ml-auto text-xs text-muted-foreground">ใช้เมนู Share ใน Safari</span>}</button>}
            <button type="button" onClick={() => void checkForAppUpdate()} disabled={appUpdateState === 'checking'} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted disabled:opacity-60"><ArrowsClockwise size={18} className={appUpdateState === 'checking' ? 'animate-spin' : undefined} aria-hidden /> {appUpdateState === 'checking' ? 'กำลังตรวจหาอัปเดต…' : 'ตรวจหาอัปเดตแอป'}{appUpdateState === 'latest' && <span className="ml-auto text-xs text-muted-foreground">เป็นเวอร์ชันล่าสุด</span>}{appUpdateState === 'error' && <span className="ml-auto text-xs text-destructive">ตรวจสอบไม่สำเร็จ</span>}</button>
            {isSignedIn ? <button type="button" onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><SignOut size={18} aria-hidden /> ออกจากระบบ</button> : <button type="button" onClick={() => setLoginOpen(true)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><LockKey size={18} aria-hidden /> เข้าสู่ระบบ</button>}
          </div>
        </section>
      </div>
    </section>
  )
}
