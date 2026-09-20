import { useState } from 'react'
import { ArrowsClockwise, DownloadSimple, LockKey, Monitor, Moon, Palette, SignOut, Sun } from '@phosphor-icons/react'
import { V3CustomCssButton } from '../components/V3CustomCssDialog'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useAuthStore, logout } from '@/stores/auth-store'
import { manuallyUpdateApp, getRememberedRegistration } from '@/lib/pwa-update'
type V3Mode = 'auto' | 'light' | 'dark'

type Props = {
  mode: V3Mode
  setMode: (mode: V3Mode) => void
}

export default function V3Settings({ mode, setMode }: Props) {
  const { isSignedIn, setLoginOpen } = useAuthStore()
  const { canInstall, isIOS, install } = usePwaInstall()
  const [appUpdateState, setAppUpdateState] = useState<'idle' | 'checking' | 'latest' | 'error'>('idle')
  const checkForAppUpdate = async () => {
    setAppUpdateState('checking')
    try {
      const result = await manuallyUpdateApp(getRememberedRegistration())
      setAppUpdateState(result === 'updated' ? 'checking' : 'latest')
    } catch {
      setAppUpdateState('error')
    }
  }

  return (
    <section className="mx-auto max-w-xl px-5 pb-8 pt-6 sm:px-6">
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Palette size={26} weight="duotone" />
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Preferences</p>
          <h1 className="text-2xl font-semibold tracking-tight">เมนูและการตั้งค่า</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">จัดการหน้าตา การติดตั้ง และบัญชีของแอป</p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">ธีม</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(['auto', 'light', 'dark'] as const).map((item) => {
              const label = item === 'auto' ? 'ตามระบบ' : item === 'light' ? 'สว่าง' : 'มืด'
              const description = item === 'auto' ? 'ใช้ค่าจากเครื่อง' : item === 'light' ? 'พื้นหลังสว่าง' : 'พื้นหลังมืด'
              const Icon = item === 'auto' ? Monitor : item === 'light' ? Sun : Moon
              return (
                <button key={item} onClick={() => setMode(item)} aria-label={`ใช้ธีม${label}`} aria-pressed={mode === item} className={`flex min-h-[76px] items-center gap-3 rounded-xl border p-3 text-left transition-colors sm:block sm:min-h-[92px] ${mode === item ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'}`}>
                  <Icon size={20} weight={mode === item ? 'fill' : 'regular'} className="shrink-0 sm:mb-2" />
                  <span className="block"><span className="block text-sm font-medium">{label}{mode === item && <span className="ml-1 text-primary">✓</span>}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">การปรับแต่ง</h2>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">ปรับ CSS เพิ่มเติมสำหรับหน้าจอของคุณ</p>
          <V3CustomCssButton />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">แอปและบัญชี</h2>
          <div className="space-y-1">
            {canInstall && <button onClick={() => isIOS ? undefined : void install()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><DownloadSimple size={18} /> ติดตั้งแอป{isIOS && <span className="ml-auto text-xs text-muted-foreground">ใช้เมนู Share ใน Safari</span>}</button>}
            <button onClick={() => void checkForAppUpdate()} disabled={appUpdateState === 'checking'} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted disabled:opacity-60"><ArrowsClockwise size={18} className={appUpdateState === 'checking' ? 'animate-spin' : undefined} /> {appUpdateState === 'checking' ? 'กำลังตรวจหาอัปเดต…' : 'ตรวจหาอัปเดตแอป'}{appUpdateState === 'latest' && <span className="ml-auto text-xs text-muted-foreground">เป็นเวอร์ชันล่าสุด</span>}{appUpdateState === 'error' && <span className="ml-auto text-xs text-destructive">ตรวจสอบไม่สำเร็จ</span>}</button>
            {isSignedIn ? <button onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><SignOut size={18} /> ออกจากระบบ</button> : <button onClick={() => setLoginOpen(true)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-muted"><LockKey size={18} /> เข้าสู่ระบบ</button>}
          </div>
        </section>
      </div>
    </section>
  )
}
