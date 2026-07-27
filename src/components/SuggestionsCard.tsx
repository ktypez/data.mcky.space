import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SuggestionDiff from './SuggestionDiff'
import { ChatDots, Check, X, CaretDown } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import type { PendingSuggestion } from '@/types'

interface SuggestionsCardProps {
  suggestions: PendingSuggestion[]
  expandedSuggestions: Set<string>
  onToggle: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  processingSuggestion: string | null
  suggestError: string
  isAdmin: boolean
}

export default function SuggestionsCard({
  suggestions,
  expandedSuggestions,
  onToggle,
  onApprove,
  onReject,
  processingSuggestion,
  suggestError,
  isAdmin,
}: SuggestionsCardProps) {
  if (suggestions.length === 0) return null

  return (
    <Card>
      <CardContent className="px-3 py-2 space-y-2">
        <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-muted-foreground flex items-center gap-1.5">
          <ChatDots className="w-3.5 h-3.5 inline-block" /> คำแนะนำการแก้ไข
        </h2>

        {suggestError && (
          <div className="px-2 py-1.5 rounded-[4px] bg-destructive/10 text-destructive text-[14px]">
            {suggestError}
          </div>
        )}

        <div className="divide-y divide-border -mx-4">
          {[...suggestions]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map((s) => (
              <div key={s.id}>
                <button
                  onClick={() => onToggle(s.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-card transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    {s.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/10 rounded-[4px] text-[13px] text-warning font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                        รอตรวจสอบ
                      </span>
                    )}
                    {s.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 rounded-[4px] text-[13px] text-success font-medium">
                        <Check className="w-3 h-3" /> อนุมัติแล้ว
                      </span>
                    )}
                    {s.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-card rounded-[4px] text-[13px] text-muted-foreground">
                        <X className="w-3 h-3" /> ปฏิเสธ
                      </span>
                    )}
                    <span className="font-mono text-[14px] text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </span>
                  </div>
                  <CaretDown
                    className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      expandedSuggestions.has(s.id) ? '' : '-rotate-90'
                    }`}
                  />
                </button>

                {expandedSuggestions.has(s.id) && (
                  <div className="px-4 pb-3 space-y-2">
                    <div className="space-y-1">
                      <SuggestionDiff label="ชื่อ" oldVal={s.original.name} newVal={s.suggested.name} />
                      <SuggestionDiff label="ร้าน" oldVal={s.original.shopName || '-'} newVal={s.suggested.shopName || '-'} />
                      <SuggestionDiff label="ที่อยู่" oldVal={s.original.address} newVal={s.suggested.address} />
                      {(s.original.lat !== s.suggested.lat || s.original.lng !== s.suggested.lng) && (
                        <div className="flex items-center gap-2 text-[15px]">
                          <span className="text-muted-foreground w-12 shrink-0">พิกัด</span>
                          <span className="font-mono text-[13px] text-muted-foreground line-through">
                            {s.original.lat != null ? `${s.original.lat.toFixed(4)}, ${s.original.lng?.toFixed(4)}` : '-'}
                          </span>
                          <span className="font-mono text-[13px] text-success font-medium">
                            {s.suggested.lat != null ? `${s.suggested.lat.toFixed(4)}, ${s.suggested.lng?.toFixed(4)}` : '-'}
                          </span>
                        </div>
                      )}
                    </div>

                    {isAdmin && s.status === 'pending' && (
                      <div className="flex gap-1.5 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onApprove(s.id)}
                          disabled={processingSuggestion === s.id}
                          className="text-success hover:bg-success/10"
                        >
                          {processingSuggestion === s.id ? (
                            <Spinner size="sm" className="animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}{' '}
                          อนุมัติ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReject(s.id)}
                          disabled={processingSuggestion === s.id}
                        >
                          {processingSuggestion === s.id ? (
                            <Spinner size="sm" className="animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}{' '}
                          ปฏิเสธ
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
