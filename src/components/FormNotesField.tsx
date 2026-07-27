import { Label } from '@/components/ui/label'

interface FormNotesFieldProps {
  value: string
  onChange: (value: string) => void
}

export default function FormNotesField({ value, onChange }: FormNotesFieldProps) {
  return (
    <div className="space-y-1">
      <Label>บันทึก</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
        rows={3}
        className="w-full px-3 py-2 text-[16px] font-sans rounded-[6px] bg-card border border-border text-muted-foreground outline-none focus:border-ring transition-colors placeholder:text-muted-foreground resize-y"
      />
    </div>
  )
}
