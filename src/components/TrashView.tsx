'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash, ArrowCounterClockwise, X } from '@phosphor-icons/react'
import { apiFetch } from '@/lib/api'
import { Card, CardAction } from '@/components/ui/card'
import BadgeTag from '@/components/BadgeTag'
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
    const res = await apiFetch('/api/clients/trash?action=restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setItems((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const handleForceDelete = async (id: string) => {
    if (!confirm('ลบถาวร? ไม่สามารถกู้คืนได้')) return
    const res = await apiFetch('/api/clients/trash?action=force-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setItems((prev) => prev.filter((c) => c.id !== id))
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
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={client.images[0]}
                      alt=""
                      loading="lazy"
                      className="w-14 h-14 aspect-square rounded-[6px] object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 aspect-square rounded-[6px] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center text-muted-foreground/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z" /></svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px] text-[var(--text-primary)] truncate">
                    {client.shopName || client.name}
                  </div>
                  {client.shopName && (
                    <div className="text-[12px] text-[var(--text-secondary)] truncate">
                      {client.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
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
