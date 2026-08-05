import { ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface SuggestionListHeaderProps {
  onClose: () => void
}

export default function SuggestionListHeader({ onClose }: SuggestionListHeaderProps) {
  return (
    <header className="h-14 bg-card flex items-center gap-3 px-4 z-30 border border-border rounded-t-[var(--frame-radius)]">
      <Button variant="outline" size="icon" onClick={onClose} aria-label="ย้อนกลับ">
        <ArrowLeft className="w-4 h-4 text-primary" />
      </Button>
      <div className="flex-1 min-w-0">
        <span className="text-[15px] font-medium text-foreground truncate block">
          คำแนะนำการแก้ไข
        </span>
      </div>
    </header>
  )
}
