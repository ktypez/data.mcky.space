import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuggestionDiff from '@/components/SuggestionDiff'
import { Check, X, Spinner, MapPin, Clock } from '@phosphor-icons/react'
import { formatDateTime } from '@/lib/utils'
import type { PendingSuggestion, Client } from '@/types'

interface PendingSuggestionListProps {
  suggestions: PendingSuggestion[]
  clients: Map<string, Client>
  onAction: (id: string, action: 'approve' | 'reject') => void
  processing: string | null
}

export default function PendingSuggestionList({
  suggestions,
  clients,
  onAction,
  processing,
}: PendingSuggestionListProps) {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Check className="w-8 h-8 mx-auto mb-2 text-success" />
        <p className="text-[15px]">ไม่มีคำแนะนำที่รอตรวจสอบ</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {suggestions.map((s) => {
        const client = clients.get(s.clientId)
        return (
          <Card key={s.id} className="p-4 space-y-3">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium text-foreground">
                  {client ? client.shopName || client.name : 'ไม่พบข้อมูล'}
                </span>
              </div>

              <div className="space-y-1.5 text-[15px]">
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

              <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDateTime(s.createdAt)}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 bg-success hover:bg-success/80 text-success-foreground"
                  onClick={() => onAction(s.id, 'approve')}
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
                  onClick={() => onAction(s.id, 'reject')}
                  disabled={processing === s.id}
                >
                  <X className="w-3.5 h-3.5" /> ปฏิเสธ
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}