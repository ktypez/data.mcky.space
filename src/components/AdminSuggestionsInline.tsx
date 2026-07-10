'use client'

import { useState, useCallback, useEffect } from 'react'
import type { PendingSuggestion, Client } from '@/types'
import {
  Check,
  X,
  Spinner,
  MapPin,
  Clock,
  ArrowLeft,
  CaretDown,
} from '@phosphor-icons/react'
import { formatDateTime } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import SuggestionDiff from '@/components/SuggestionDiff'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  onClose: () => void
}

export default function AdminSuggestionsInline({ onClose }: Props) {
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([])
  const [clients, setClients] = useState<Map<string, Client>>(new Map())
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const fetchData = useCallback(async () => {
    setError('')
    try {
      const [sugRes, clientRes] = await Promise.all([
        apiFetch('/api/suggestions?status=all'),
        apiFetch('/api/clients'),
      ])
      if (!sugRes.ok || !clientRes.ok) throw new Error('Failed to fetch data')
      const sugData: PendingSuggestion[] = await sugRes.json()
      const clientData: Client[] = await clientRes.json()
      setSuggestions(sugData)
      setClients(new Map(clientData.map((c) => [c.id, c])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const res = await apiFetch(`/api/suggestions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'ดำเนินการไม่สำเร็จ')
      }
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setProcessing(null)
    }
  }

  useEffect(() => {
    Promise.resolve().then(fetchData)
  }, [fetchData])

  const pendingList = suggestions.filter((s) => s.status === 'pending')
  const historyList = suggestions.filter((s) => s.status !== 'pending')

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* ── HEADER ── */}
      <header className="h-14 bg-card flex items-center gap-3 px-4 sticky top-0 z-30 shadow-[0_1px_4px_rgba(0,0,0,.07)] border-b border-border">
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
        </Button>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-foreground truncate block">
            คำแนะนำการแก้ไข
          </span>
        </div>
      </header>

      {/* ── TOOLBAR ── */}
      <div className="bg-[var(--card)] border-b border-[var(--border)]">
        <div className="px-4 py-2 flex items-center gap-2 min-h-[40px] overflow-x-auto">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant={tab === 'pending' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('pending')}
            >
              รอตรวจสอบ ({pendingList.length})
            </Button>
            <Button
              variant={tab === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('history')}
            >
              ประวัติ ({historyList.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 px-3 py-2 rounded-[6px] bg-[var(--primary)]/10 text-[var(--primary)] text-[13px]">
            {error}
          </div>
        )}

        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 space-y-3">
                <CardContent className="p-0 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && tab === 'pending' && (
          <div className="p-4 space-y-3">
            {pendingList.length === 0 ? (
              <div className="text-center py-20 text-[var(--text-muted)]">
                <Check className="w-8 h-8 mx-auto mb-2 text-[var(--success)]" />
                <p className="text-[13px]">ไม่มีคำแนะนำที่รอตรวจสอบ</p>
              </div>
            ) : (
              pendingList.map((s) => {
                const client = clients.get(s.clientId)
                return (
                  <Card key={s.id} className="p-4 space-y-3">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate font-medium text-[var(--text-primary)]">
                          {client ? client.shopName || client.name : 'ไม่พบข้อมูล'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[13px]">
                        <SuggestionDiff label="ชื่อ" oldVal={s.original.name} newVal={s.suggested.name} />
                        <SuggestionDiff
                          label="ร้าน"
                          oldVal={s.original.shopName || '-'}
                          newVal={s.suggested.shopName || '-'}
                        />
                        <SuggestionDiff
                          label="ที่อยู่"
                          oldVal={s.original.address}
                          newVal={s.suggested.address}
                        />
                        {(s.original.lat !== s.suggested.lat ||
                          s.original.lng !== s.suggested.lng) && (
                          <div className="flex gap-2">
                            <span className="text-[var(--text-muted)] w-12 shrink-0">
                              พิกัด
                            </span>
                            <span className="text-[var(--text-muted)] line-through">
                              {s.original.lat != null
                                ? `${s.original.lat?.toFixed(4)}, ${s.original.lng?.toFixed(4)}`
                                : '-'}
                            </span>
                            <span className="text-[var(--success)] font-medium">
                              {s.suggested.lat != null
                                ? `${s.suggested.lat?.toFixed(4)}, ${s.suggested.lng?.toFixed(4)}`
                                : '-'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(s.createdAt)}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 bg-[var(--success)] hover:bg-[var(--success)]/80 text-[var(--success-foreground)]"
                          onClick={() => handleAction(s.id, 'approve')}
                          disabled={processing === s.id}
                        >
                          {processing === s.id ? (
                            <Spinner className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" /> อนุมัติ
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAction(s.id, 'reject')}
                          disabled={processing === s.id}
                        >
                          <X className="w-3.5 h-3.5" /> ปฏิเสธ
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {!loading && tab === 'history' && (
          <div className="p-4 space-y-3">
            {historyList.length === 0 ? (
              <div className="text-center py-20 text-[var(--text-muted)]">
                <p className="text-[13px]">ไม่มีประวัติ</p>
              </div>
            ) : (
              historyList.map((s) => {
                const client = clients.get(s.clientId)
                return (
                  <Card
                    key={s.id}
                    className={`p-4 space-y-2 ${
                      s.status === 'approved'
                        ? 'border-[var(--success)]/30'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    <button
                      onClick={() => toggle(s.id)}
                      className="w-full flex items-center gap-2 text-[13px] cursor-pointer text-left"
                    >
                      {s.status === 'approved' ? (
                        <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      )}
                      <span className="text-[var(--text-primary)] font-medium truncate flex-1 min-w-0">
                        {client ? client.shopName || client.name : 'ไม่พบข้อมูล'}
                      </span>
                      <span
                        className={`text-[11px] shrink-0 ${s.status === 'approved' ? 'text-[var(--success)]' : 'text-[var(--primary)]'}`}
                      >
                        {s.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                      </span>
                      <CaretDown
                        className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${expanded.has(s.id) ? '' : '-rotate-90'}`}
                      />
                    </button>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(s.updatedAt)}
                    </div>
                    {expanded.has(s.id) && (
                      <div className="space-y-1.5 text-[13px] pt-1">
                        <SuggestionDiff label="ชื่อ" oldVal={s.original.name} newVal={s.suggested.name} />
                        <SuggestionDiff
                          label="ร้าน"
                          oldVal={s.original.shopName || '-'}
                          newVal={s.suggested.shopName || '-'}
                        />
                        <SuggestionDiff
                          label="ที่อยู่"
                          oldVal={s.original.address}
                          newVal={s.suggested.address}
                        />
                        {(s.original.lat !== s.suggested.lat ||
                          s.original.lng !== s.suggested.lng) && (
                          <div className="flex gap-2">
                            <span className="text-[var(--text-muted)] w-12 shrink-0">
                              พิกัด
                            </span>
                            <span className="text-[var(--text-muted)] line-through">
                              {s.original.lat != null
                                ? `${s.original.lat?.toFixed(4)}, ${s.original.lng?.toFixed(4)}`
                                : '-'}
                            </span>
                            <span className="text-[var(--success)] font-medium">
                              {s.suggested.lat != null
                                ? `${s.suggested.lat?.toFixed(4)}, ${s.suggested.lng?.toFixed(4)}`
                                : '-'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}


