import { getBadgePreset } from '@/components/BadgeTag'
import { Switch } from '@/components/ui/switch'

interface FormBadgeFieldProps {
  badge: string | null
  onChange: (badge: string | null) => void
  visible: boolean
}

export default function FormBadgeField({ badge, onChange, visible }: FormBadgeFieldProps) {
  if (!visible) return null

  const preset = getBadgePreset(badge)

  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-[6px] border border-border bg-card">
      <span className={`text-[15px] font-medium ${preset ? preset.text : 'text-muted-foreground'}`}>
        {preset ? preset.label : 'จ่ายในวัน'}
      </span>
      <Switch
        checked={badge === 'penpay'}
        onCheckedChange={(checked) => onChange(checked ? 'penpay' : null)}
      />
    </div>
  )
}
