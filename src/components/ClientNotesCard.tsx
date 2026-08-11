import { ChatDots } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'

interface ClientNotesCardProps {
  notes: string
}

export default function ClientNotesCard({ notes }: ClientNotesCardProps) {
  if (!notes || !notes.trim()) return null

  return (
    <Card>
      <CardContent className="px-3 py-2 space-y-2">
        <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-muted-foreground flex items-center gap-1.5">
          <ChatDots className="w-3.5 h-3.5 inline-block" /> บันทึก
        </h2>
        <p className="text-[16px] text-foreground leading-relaxed whitespace-pre-wrap break-words rounded-md bg-muted/50 border-l-2 border-accent pl-3 pr-2 py-2">
          {notes}
        </p>
      </CardContent>
    </Card>
  )
}
