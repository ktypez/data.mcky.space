import { useEffect, useState } from 'react'
import { CloudArrowDown, CloudCheck, WarningCircle } from '@phosphor-icons/react'
import { listQueuedMutations } from '@/lib/offline-db'
import { useAuthStore } from '@/stores/auth-store'

export function SyncStatus() {
  const userId = useAuthStore(s => s.userId)
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(0)

  useEffect(() => {
    const refresh = async () => {
      setOnline(typeof navigator === 'undefined' || navigator.onLine)
      if (!userId) {
        setPending(0)
        setFailed(0)
        return
      }
      const rows = await listQueuedMutations(userId)
      setPending(rows.length)
      setFailed(rows.filter(row => row.lastError).length)
    }
    void refresh()
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => {
      window.removeEventListener('online', refresh)
      window.removeEventListener('offline', refresh)
      window.clearInterval(timer)
    }
  }, [userId])

  if (!online) return <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground" role="status"><CloudArrowDown size={14} aria-hidden /> ออฟไลน์</div>
  if (failed > 0) return <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive" role="status"><WarningCircle size={14} aria-hidden /> ซิงก์ล้มเหลว {failed}</div>
  if (pending > 0) return <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300" role="status"><CloudArrowDown size={14} aria-hidden /> รอซิงก์ {pending}</div>
  return <div className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><CloudCheck size={14} aria-hidden /> ซิงก์แล้ว</div>
}
