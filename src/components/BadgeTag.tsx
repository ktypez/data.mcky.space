interface BadgeTagProps {
  badge: string | null
  size?: 'xs' | 'sm' | 'md'
}

interface BadgePreset {
  label: string
  bg: string
  text: string
  border: string
}

const BADGE_PRESETS: Record<string, BadgePreset> = {
  penpay: {
    label: 'จ่ายภายในวัน',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
  },
}

const DEFAULT_PRESET: BadgePreset = {
  label: '?',
  bg: 'bg-secondary text-secondary-foreground',
  text: 'text-secondary-foreground',
  border: 'border-border',
}

export function getBadgePreset(badge: string | null): BadgePreset | null {
  if (!badge) return null
  return BADGE_PRESETS[badge] ?? { ...DEFAULT_PRESET, label: badge }
}

export default function BadgeTag({ badge, size = 'sm' }: BadgeTagProps) {
  const preset = getBadgePreset(badge)
  if (!preset) return null

  const sizeClasses = size === 'xs' ? 'text-[10px] px-1 py-[0px]' : size === 'sm' ? 'text-[12px] px-1.5 py-[1px]' : 'text-[13px] px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center font-medium rounded-[4px] border leading-tight ${sizeClasses} ${preset.bg} ${preset.text} ${preset.border}`}
    >
      {preset.label}
    </span>
  )
}
