import { Pencil, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface ClientActionButtonsProps {
  isAdmin: boolean
  hideActions?: boolean
  onEdit: () => void
  onDelete: () => void
}

export default function ClientActionButtons({
  isAdmin,
  hideActions,
  onEdit,
  onDelete,
}: ClientActionButtonsProps) {
  if (hideActions || !isAdmin) return null

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1 h-12 border-accent text-accent"
        onClick={onEdit}
      >
        <Pencil className="w-4 h-4" />
        แก้ไข
      </Button>
      <Button
        variant="destructive"
        className="flex-1 h-12 border-destructive"
        onClick={onDelete}
      >
        <Trash className="w-4 h-4" />
        ลบ
      </Button>
    </div>
  )
}