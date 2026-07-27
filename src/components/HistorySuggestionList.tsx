import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuggestionDiff from '@/components/SuggestionDiff'
import SuggestionDetail from '@/components/SuggestionDetail'
import { Check, X, Clock, CaretDown } from '@phosphor-icons/react'
import { formatDateTime } from '@/lib/utils'
import type { PendingSuggestion, Client } from '@/types'

interface HistorySuggestionListProps {
  suggestions: PendingSuggestion[]
  clients: Map<string, Client>
}

export default function HistorySuggestionList({ suggestions, clients }: HistorySuggestionListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-[15px]">ไม่มีประวัติ</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {suggestions.map((s) => {
        const client = clients.get(s.clientId)
        return (
          <Card
            key={s.id}
            className={`p-4 space-y-2 ${
              s.status === 'approved' ? 'border-success/30' : 'border-border'
            }`}
          >
            <button onClick={() => toggle(s.id)} className="w-full flex items-center gap-2 text-[15px] cursor-pointer text-left">
              {s.status === 'approved' ? (
                <Check className="w-4 h-4 text-success shrink-0" />
              ) : (
                <X className="w-4 h-4 text-primary shrink-0" />
              )}
              <span className="text-foreground font-medium truncate flex-1 min-w-0">
                {client ? client.shopName || client.name : 'ไม่พบข้อมูล'}
              </span>
              <span className={`text-[13px] shrink-0 ${s.status === 'approved' ? 'text-success' : 'text-primary'}`}>
                {s.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
              </span>
              <CaretDown
                className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  expanded.has(s.id) ? '' : '-rotate-90'
                }`}
              />
            </button>
            <div className="text-[13px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(s.updatedAt)}
            </div>
            {expanded.has(s.id) && (
              <SuggestionDetail
                original={s.original}
                suggested={s.suggested}
                className="space-y-1.5 text-[15px] pt-1"
              />
            )}
          </Card>
        )
      })}
    </div>
  )
}