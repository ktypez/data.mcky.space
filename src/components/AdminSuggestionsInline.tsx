
import { useState, useCallback, useEffect } from 'react'
import type { PendingSuggestion, Client } from '@/types'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import SuggestionListHeader from './SuggestionListHeader'
import PendingSuggestionList from './PendingSuggestionList'
import HistorySuggestionList from './HistorySuggestionList'

interface Props {
  onClose: () => void
  onAction?: () => void
}

export default function AdminSuggestionsInline({ onClose, onAction }: Props) {
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([])
  const [clients, setClients] = useState<Map<string, Client>>(new Map())
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

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
      onAction?.()
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
      <div className="app-frame min-w-0 flex-1">
        {/* ── HEADER ── */}
        <SuggestionListHeader onClose={onClose} />

        {/* ── TOOLBAR ── */}
        <div className="bg-card border-b border-border">
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
          <div className="mx-4 mt-4 px-3 py-2 rounded-[6px] bg-primary/10 text-primary text-[15px]">
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
          <PendingSuggestionList
            suggestions={pendingList}
            clients={clients}
            onAction={handleAction}
            processing={processing}
          />
        )}

        {!loading && tab === 'history' && (
          <HistorySuggestionList
            suggestions={historyList}
            clients={clients}
          />
        )}
        </div>
      </div>
    </div>
  )
}


