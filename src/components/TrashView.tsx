'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trash, ArrowCounterClockwise, X } from '@phosphor-icons/react'
import { apiFetch } from '@/lib/api'
interface TrashItem {
  id: string
  name: string
  shopName: string
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
    const res = await apiFetch(`/api/clients/${id}?action=restore`, { method: 'POST' })
    if (res.ok) {
      setItems((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const handleForceDelete = async (id: string) => {
    if (!confirm('ลบถาวร? ไม่สามารถกู้คืนได้')) return
    const res = await apiFetch(`/api/clients/${id}?action=force`, { method: 'POST' })
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
        <div className="space-y-2">
          {items.map((client) => (
            <div
              key={client.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {client.shopName || client.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ลบเมื่อ {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString('th-TH') : '-'}
                </p>
              </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
