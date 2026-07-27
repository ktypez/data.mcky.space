import { Plus, Pencil } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface FormSubmitButtonsProps {
  editing: boolean
  uploading?: boolean
  onCancel: () => void
}

export default function FormSubmitButtons({ editing, uploading, onCancel }: FormSubmitButtonsProps) {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="button" variant="outline" className="flex-1 h-12" onClick={onCancel}>
        ยกเลิก
      </Button>
      <Button type="submit" className="flex-1 h-12" disabled={uploading}>
        {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        {uploading ? 'กำลังอัปโหลด...' : editing ? 'อัปเดตข้อมูล' : 'เพิ่มลูกค้าใหม่'}
      </Button>
    </div>
  )
}
