import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { acceptUpdate, startUpdateChecks } from '@/lib/pwa-update'

export function UpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>()
  const [error, setError] = useState(false)
  const [applying, setApplying] = useState(false)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) { setRegistration(reg) },
    onRegisterError() { /* Online app remains usable if SW is unavailable. */ },
  })
  useEffect(() => registration ? startUpdateChecks(registration) : undefined, [registration])
  if (!needRefresh) return null
  return (
    <aside role="status" aria-live="polite" style={{ position: 'fixed', bottom: 'max(20px, env(safe-area-inset-bottom))', left: 16, right: 16, zIndex: 10000, margin: 'auto', maxWidth: 480, padding: 16, borderRadius: 12, color: '#fff', background: '#24242c', boxShadow: '0 4px 24px #0006' }}>
      <strong>มีเวอร์ชันใหม่พร้อมใช้งาน</strong>
      <p style={{ margin: '8px 0', fontSize: 14 }}>บันทึกงานในทุกแท็บก่อนอัปเดต หรือใช้งานต่อแล้วค่อยกดภายหลัง</p>
      <button disabled={applying} style={{ padding: '8px 16px', borderRadius: 8, background: '#fff', color: '#24242c', cursor: 'pointer' }} onClick={async () => {
        setError(false)
        try {
          await acceptUpdate(async (reload) => {
            setApplying(true)
            await updateServiceWorker(reload)
          }, () => window.confirm('บันทึกงานทุกแท็บแล้วหรือยัง? อัปเดตจะโหลดหน้านี้ใหม่'))
        } catch { setError(true); setApplying(false) }
      }}>{applying ? 'กำลังอัปเดต…' : 'อัปเดตและรีเฟรช'}</button>
      {error && <p role="alert">อัปเดตไม่สำเร็จ ลองใหม่เมื่อเชื่อมต่ออินเทอร์เน็ต</p>}
    </aside>
  )
}
