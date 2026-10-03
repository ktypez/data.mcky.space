interface FormBadgeFieldProps {
  badge: string | null
  onChange: (badge: string | null) => void
  visible: boolean
}

export default function FormBadgeField({ badge, onChange, visible }: FormBadgeFieldProps) {
  if (!visible) return null

  const options: { value: string | null; label: string }[] = [
    { value: 'penpay', label: 'จ่ายในวัน' },
    { value: 'credit', label: 'บัตรเครดิต' },
  ]

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">ประเภทชำระ</legend>
      <div className="flex gap-2">
        {options.map(opt => {
          const active = badge === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : opt.value)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'}`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {badge && <p className="text-xs opacity-60">เลือก “{options.find(o=>o.value===badge)?.label}” — กดอีกครั้งเพื่อเอาออก</p>}
    </fieldset>
  )
}
