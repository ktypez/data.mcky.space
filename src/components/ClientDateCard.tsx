import { Calendar, Clock } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'

interface ClientDateCardProps {
  createdAt: number
  updatedAt: number
}

export default function ClientDateCard({ createdAt, updatedAt }: ClientDateCardProps) {
  return (
    <Card>
      <CardContent className="px-3 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 inline-block align-text-bottom" /> วันที่
          </h2>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-[14px] text-muted-foreground">
              สร้าง: {formatDateTime(createdAt)}
            </span>
          </div>
          {updatedAt > createdAt && (
            <div className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[14px] text-muted-foreground">
                อัปเดต: {formatDateTime(updatedAt)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
