import { User } from '@phosphor-icons/react'

/**
 * EmptyDetailPlaceholder — shown in the right pane when no client is
 * selected (desktop 2-pane mode). Mirrors Mail.app's "select a message"
 * state so users immediately understand where detail content will appear.
 */
export default function EmptyDetailPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <User className="size-7" weight="duotone" />
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold text-foreground">
            เลือกลูกค้าเพื่อดูรายละเอียด
          </p>
          <p className="text-[13px] text-muted-foreground">
            คลิกรายชื่อทางซ้ายเพื่อเปิดข้อมูล
          </p>
        </div>
      </div>
    </div>
  )
}
