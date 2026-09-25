import { Label } from '@/components/ui/label'

interface FormNotesFieldProps {
  value: string
  onChange: (value: string) => void
  id?: string
}

export default function FormNotesField({ value, onChange, id = 'form-notes' }: FormNotesFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>บันทึก</Label>
      <textarea
        id={id}
        name="notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="เพิ่มรายละเอียด…"
        className="w-full resize-y rounded-[6px] border border-border bg-card px-3 py-2 font-sans text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
      />
    </div>
  )
}
