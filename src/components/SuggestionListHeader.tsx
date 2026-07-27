import { ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface SuggestionListHeaderProps {
  onClose: () => void
  pendingCount: number
  historyCount: number
  tab: 'pending' | 'history'
  onTabChange: (tab: 'pending' | 'history') => void
}

export default function SuggestionListHeader({
  onClose,
  pendingCount,
  historyCount,
  tab,
  onTabChange,
}: SuggestionListHeaderProps) {
  return (
    <>
      {/* ── HEADER ── */}
      <header className="h-14 bg-card flex items-center gap-3 px-4 sticky top-0 z-30 shadow-[0_1px_4px_rgba(0,0,0,.07)] border-b border-border">
        <Button variant="outline" size="icon" onClick={onClose} aria-label="ย้อนกลับ">
          <ArrowLeft className="w-4 h-4 text-primary" />
        </Button>
        <div className="flex-1 min-w-0">
          <span className="text-[15px] font-medium text-foreground truncate block">
            คำแนะนำการแก้ไข
          </span>
        </div>
      </header>

      {/* ── TOOLBAR ── */}
      <div className="bg-card border-b border-border">
        <div className="px-4 py-2 flex items-center gap-2 min-h-[40px] overflow-x-auto">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant={tab === 'pending' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabChange('pending')}
            >
              รอตรวจสอบ ({pendingCount})
            </Button>
            <Button
              variant={tab === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabChange('history')}
            >
              ประวัติ ({historyCount})
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}