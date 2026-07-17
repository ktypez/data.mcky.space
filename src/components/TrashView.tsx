
import { useState, useEffect, useCallback } from 'react'
import { Trash, ArrowCounterClockwise, X } from '@phosphor-icons/react'
import { apiFetch } from '@/lib/api'
import { Card, CardAction } from '@/components/ui/card'
import BadgeTag from '@/components/BadgeTag'
import { PlaceholderAvatar } from '@/components/ClientCardBadges'
interface TrashItem {
  id: string
  name: string
  shopName: string
  images: string[]
  badge: string | null
  deletedAt: number
}

interface Props {
  onClose: () => void
}

export default function TrashView({ onClose }: Props) {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/clients/trash')
      if (res.ok) {
        setItems(await res.json())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

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
      } else {
        setError('กู้คืนไม่สำเร็จ')
      }
    } catch {
      setError('กู้คืนไม่สำเร็จ')
    }
  }

  const handleForceDelete = async (id: string) => {
    if (!confirm('ลบถาวร? ไม่สามารถกู้คืนได้')) return
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
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Trash className="w-5 h-5" />
          ถังขยะ
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          aria-label="ปิด"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">ถังขยะว่าง</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items.map((client) => (
            <Card key={client.id} className="p-3.5 flex flex-col gap-2.5 overflow-visible">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  {client.images.length > 0 ? (
                    <img
                      src={client.images[0]}
                      alt=""
                      loading="lazy"
                      className="w-14 h-14 aspect-square rounded-[6px] object-cover shrink-0"
                    />
                  ) : (
                    <PlaceholderAvatar className="w-14 h-14 aspect-square rounded-[6px] shrink-0" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[16px] text-[var(--text-primary)] truncate">
                    {client.shopName || client.name}
                  </div>
                  {client.shopName && (
                    <div className="text-[14px] text-[var(--text-secondary)] truncate">
                      {client.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[var(--text-muted)]">
                  ลบเมื่อ {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString('th-TH') : '-'}
                </span>
                <BadgeTag badge={client.badge} size="sm" />
              </div>

              <CardAction className="justify-end mt-auto">
                <button
                  onClick={() => handleRestore(client.id)}
                  className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                  title="กู้คืน"
                >
                  <ArrowCounterClockwise className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleForceDelete(client.id)}
                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  title="ลบถาวร"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </CardAction>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
