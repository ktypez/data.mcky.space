import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowCounterClockwise, Trash } from '@phosphor-icons/react'
import { useAuthStore } from '@/stores/auth-store'
import { useClientStore } from '@/stores/client-store'
import { apiFetch } from '@/lib/api'
import ClientNames from '@/components/ClientNames'
import V2Confirm from '@/v2/components/V2Confirm'
import { formatDateTime } from '@/lib/utils'

interface TrashItem {
  id: string
  name: string[]
  shopName: string[]
  images: string[]
  badge: string | null
  deletedAt: number
}

/**
 * V2Trash — /v2/trash. Same endpoints and confirm() semantics as the
 * classic TrashView; presentation is v2 hairline rows. Admin-only:
 * non-admins bounce back to the catalog.
 */
export default function V2Trash() {
  const { isAdmin } = useAuthStore()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forceTarget, setForceTarget] = useState<TrashItem | null>(null)
  const [forceBusy, setForceBusy] = useState(false)
  const refreshClients = useClientStore((s) => s.refresh)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/clients/trash')
      if (res.ok) {
        setItems(await res.json())
      } else {
        setError('โหลดรายการถังขยะไม่สำเร็จ')
      }
    } catch {
      setError('โหลดรายการถังขยะไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void fetchTrash()
  }, [isAdmin, fetchTrash])

  if (!isAdmin) return <Navigate to="/v2" replace />

  const handleRestore = async (id: string) => {
    setError(null)
    try {
      const res = await apiFetch('/api/clients/trash?action=restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((c) => c.id !== id))
        // Make the restored record visible in the v2 catalog immediately.
        void refreshClients().catch(() => undefined)
      } else {
        setError('กู้คืนไม่สำเร็จ')
      }
    } catch {
      setError('กู้คืนไม่สำเร็จ')
    }
  }

  const handleForceDelete = async (id: string) => {
    setForceBusy(true)
    setError(null)
    try {
      const res = await apiFetch('/api/clients/trash?action=force-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((c) => c.id !== id))
      } else {
        setError('ลบไม่สำเร็จ')
      }
    } catch {
      setError('ลบไม่สำเร็จ')
    } finally {
      setForceBusy(false)
      setForceTarget(null)
    }
  }

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[880px] px-5 pt-10 pb-28 md:px-8">
      <p className="v2-eyebrow">System</p>
      <h1 className="v2-title">trash</h1>
      <p className="v2-meta mt-4" role="status" aria-live="polite">
        {loading ? (
          <span>loading…</span>
        ) : (
          <>
            <span>{items.length} items</span>
            <span>auto-purge by server cleanup</span>
          </>
        )}
      </p>

      {error && (
        <p className="mt-4 border px-3.5 py-2.5 font-mono text-[12px]" style={{ borderColor: 'var(--destructive)', color: 'var(--destructive)' }} role="alert">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="v2-fade-up mt-6 divide-y divide-border border border-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3.5 bg-background p-4 transition-colors hover:bg-card">
              {/* Initial block */}
              <span
                aria-hidden="true"
                className="flex h-[40px] w-[40px] shrink-0 items-center justify-center border border-border bg-card font-mono text-sm text-muted-foreground"
              >
                {(item.shopName[0] || item.name[0] || '·').trim().charAt(0).toUpperCase()}
              </span>

              <span className="min-w-0 block flex-1">
                <ClientNames
                  client={item}
                  variant="list"
                  titleClassName="text-[14px] leading-snug font-semibold text-foreground"
                  subClassName="mt-0.5 font-mono text-[11px] text-muted-foreground"
                />
                <span className="mt-1 block font-mono text-[10px] tabular-nums text-muted-foreground/70 uppercase">
                  deleted {formatDateTime(item.deletedAt)}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-1.5">
                <button type="button" className="v2-btn" onClick={() => void handleRestore(item.id)}>
                  <ArrowCounterClockwise className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">restore</span>
                </button>
                <button type="button" className="v2-btn" onClick={() => setForceTarget(item)} aria-label={`Delete forever: ${item.name[0] || item.shopName[0] || item.id}`}>
                  <Trash className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">delete</span>
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="mt-6 flex min-h-[200px] flex-col items-center justify-center border border-dashed border-border px-6 py-12 text-center">
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary uppercase">trash empty</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            ไม่มีรายการที่ถูกลบรอการตัดสินใจ — สะอาดเอี่ยม
          </p>
        </div>
      )}
      <V2Confirm
        open={forceTarget !== null}
        destructive
        title="delete forever?"
        body={
          forceTarget
            ? `“${forceTarget.name[0] || forceTarget.shopName[0] || forceTarget.id.slice(0, 8)}” จะหาย — ไม่สามารถกู้คืนได้อีก`
            : undefined
        }
        confirmLabel={forceBusy ? 'deleting…' : 'delete forever'}
        busy={forceBusy}
        onConfirm={() => {
          if (forceTarget) void handleForceDelete(forceTarget.id)
        }}
        onClose={() => setForceTarget(null)}
      />
    </div>
  )
}
