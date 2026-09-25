import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useClientStore } from '@/stores/client-store'
import { treatyClient, treatyHeaders } from '@/lib/treaty'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import AppDialog from '@/components/AppDialog'
import { formatDateTime } from '@/lib/utils'

interface TrashItem {
  id: string
  name: string[]
  shopName: string[]
  images: string[]
  badge: string | null
  deletedAt: number
}

export default function TrashPage() {
  const { isAdmin, checking } = useAuthStore()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<TrashItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [focused, setFocused] = useState(0)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])
  const refresh = useClientStore(s => s.refresh)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: requestError } = await treatyClient.api.clients.trash.get({ headers: await treatyHeaders() })
      if (!requestError && data) setItems(data as unknown as TrashItem[])
      else setError('โหลดถังขยะไม่สำเร็จ')
    } catch {
      setError('โหลดถังขยะไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void fetchTrash()
  }, [isAdmin, fetchTrash])

  useEffect(() => {
    setFocused(f => Math.min(f, Math.max(items.length - 1, 0)))
  }, [items.length])

  if (checking) return <div className="p-8 text-center text-sm text-muted-foreground" role="status">กำลังตรวจสิทธิ์…</div>
  if (!isAdmin) return <Navigate to="/" replace />

  const focusRow = (index: number) => {
    setFocused(index)
    rowRefs.current[index]?.focus()
  }

  const restore = async (id: string) => {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const { error: requestError } = await treatyClient.api.clients.trash.post({ id }, { query: { action: 'restore' }, headers: await treatyHeaders() })
      if (!requestError) {
        setItems(current => current.filter(item => item.id !== id))
        void refresh().catch(() => undefined)
      } else setError('กู้คืนไม่สำเร็จ')
    } catch {
      setError('กู้คืนไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  const forceDelete = async (id: string) => {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const { error: requestError } = await treatyClient.api.clients.trash.post({ id }, { query: { action: 'force-delete' }, headers: await treatyHeaders() })
      if (!requestError) setItems(current => current.filter(item => item.id !== id))
      else setError('ลบไม่สำเร็จ')
    } catch {
      setError('ลบไม่สำเร็จ')
    } finally {
      setBusyId(null)
      setConfirm(null)
    }
  }

  const onRowKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusRow(Math.min(index + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusRow(Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      void restore(items[index].id)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      setConfirm(items[index])
    }
  }

  return (
    <section className="mx-auto max-w-xl px-5 pb-8 pt-6 sm:px-6">
      <h1 className="sr-only">ถังขยะ</h1>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <span>{loading ? 'กำลังโหลด…' : `${items.length} รายการ`}</span>
        <span className="font-mono opacity-60">↑↓ เลือก · Enter กู้คืน</span>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div role="list" aria-label="รายการถังขยะ" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground" role="status">กำลังโหลดถังขยะ…</div>
        ) : items.length === 0 && !error ? (
          <div className="p-8 text-center text-sm opacity-50">ถังขยะว่าง</div>
        ) : (
          items.map((item, index) => {
            const active = index === focused
            return (
              <div key={item.id} role="listitem" onMouseEnter={() => setFocused(index)} className={`flex items-center ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'} border-b border-border last:border-b-0`}>
                <button
                  ref={element => { rowRefs.current[index] = element }}
                  type="button"
                  onFocus={() => setFocused(index)}
                  onKeyDown={event => onRowKeyDown(event, index)}
                  onClick={() => void restore(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                  aria-label={`กู้คืน ${item.shopName[0] || item.name[0] || item.id}`}
                >
                  {item.images[0] ? <AppImage src={item.images[0]} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover border border-border" /> : <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono ${active ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground'}`}>{(item.shopName[0] || item.name[0] || '·').trim().charAt(0).toUpperCase()}</span>}
                  <span className="min-w-0 flex-1">
                    <ClientNames client={item} variant="list" titleClassName={`text-sm truncate ${active ? 'text-primary-foreground' : 'text-foreground'}`} subClassName={`text-xs truncate ${active ? 'text-primary-foreground/60' : 'opacity-60'}`} />
                    <span className={`font-mono text-[10px] ${active ? 'text-primary-foreground/50' : 'opacity-30'}`}>ลบเมื่อ {formatDateTime(item.deletedAt)}</span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1 pr-3">
                  <button type="button" disabled={busyId === item.id} onClick={() => void restore(item.id)} className={`min-h-11 rounded-full px-3 text-xs disabled:opacity-50 ${active ? 'bg-background text-foreground' : 'border border-border bg-card hover:bg-muted'}`}>กู้คืน</button>
                  <button type="button" disabled={busyId === item.id} onClick={() => setConfirm(item)} aria-label={`ลบ ${item.shopName[0] || item.name[0] || item.id} ถาวร`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold leading-none transition-colors disabled:opacity-50 ${active ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground'}`}>×</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AppDialog open={confirm !== null} onClose={() => { if (!busyId) setConfirm(null) }} title="ลบถาวร" showHeader>
        {confirm && (
          <div className="p-6">
            <p className="mt-2 text-sm text-muted-foreground">“{confirm.shopName[0] || confirm.name[0] || confirm.id.slice(0, 8)}” จะหายถาวร และไม่สามารถกู้คืนได้</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} disabled={busyId !== null} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">ยกเลิก</button>
              <button type="button" disabled={busyId !== null} onClick={() => void forceDelete(confirm.id)} className="min-h-11 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">{busyId === confirm.id ? 'กำลังลบ…' : 'ลบถาวร'}</button>
            </div>
          </div>
        )}
      </AppDialog>
    </section>
  )
}
