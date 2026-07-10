interface SuggestionBadgeProps {
  size?: 'sm' | 'md'
}

export default function SuggestionBadge({ size = 'sm' }: SuggestionBadgeProps) {
  const badgeSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const fontSize = size === 'sm' ? 'text-[7px]' : 'text-[8px]'
  const border = size === 'sm' ? 'border-2' : 'border-2'

  return (
    <div
      className={`absolute -top-1 -right-1 ${badgeSize} rounded-full bg-[var(--warning)] ${border} border-[var(--card)] flex items-center justify-center animate-in fade-in zoom-in-75 duration-200`}
      title="มีคำแนะนำรอตรวจสอบ"
    >
      <span className={`${fontSize} font-bold text-white leading-none`}>!</span>
    </div>
  )
}
