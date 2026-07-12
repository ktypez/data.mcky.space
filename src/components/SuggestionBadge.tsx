import { Lightbulb } from '@phosphor-icons/react'

interface SuggestionBadgeProps {
  size?: 'sm' | 'md'
  className?: string
}

export default function SuggestionBadge({ size = 'sm', className = '' }: SuggestionBadgeProps) {
  const badgeSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
  const border = size === 'sm' ? 'border-2' : 'border-2'

  return (
    <div
      className={`absolute ${badgeSize} rounded-full bg-[var(--warning)] ${border} border-[var(--card)] flex items-center justify-center animate-in fade-in zoom-in-75 duration-200 ${className}`}
      title="มีคำแนะนำรอตรวจสอบ"
    >
      <Lightbulb className={`${iconSize} text-white`} weight="fill" />
    </div>
  )
}
