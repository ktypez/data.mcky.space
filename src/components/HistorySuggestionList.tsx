import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuggestionDiff from '@/components/SuggestionDiff'
import { Check, X, Clock, CaretDown, MapPin } from '@phosphor-icons/react'
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
              <div className="space-y-1.5 text-[15px] pt-1">
                <SuggestionDiff label="ชื่อ" oldVal={s.original.name} newVal={s.suggested.name} />
                <SuggestionDiff label="ร้าน" oldVal={s.original.shopName || '-'} newVal={s.suggested.shopName || '-'} />
                <SuggestionDiff label="ที่อยู่" oldVal={s.original.address} newVal={s.suggested.address} />
                {(s.original.lat !== s.suggested.lat || s.original.lng !== s.suggested.lng) && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-12 shrink-0">พิกัด</span>
                    <span className="text-muted-foreground line-through">
                      {s.original.lat != null ? `${s.original.lat?.toFixed(4)}, ${s.original.lng?.toFixed(4)}` : '-'}
                    </span>
                    <span className="text-success font-medium">
                      {s.suggested.lat != null ? `${s.suggested.lat?.toFixed(4)}, ${s.suggested.lng?.toFixed(4)}` : '-'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}