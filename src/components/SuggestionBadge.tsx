import { Lightbulb } from '@phosphor-icons/react'

interface SuggestionBadgeProps {
  size?: 'sm' | 'md'
  className?: string
}

export default function SuggestionBadge({ size = 'sm', className = '' }: SuggestionBadgeProps) {
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
  const border = 'border-2'

  return (
    <div
      className={`rounded-full bg-[var(--warning)] ${border} border-[var(--card)] p-0.5 flex items-center justify-center animate-in fade-in zoom-in-75 duration-200 ${className}`}
      title="มีคำแนะนำรอตรวจสอบ"
    >
      <Lightbulb className={`${iconSize} text-white`} weight="fill" />
    </div>
  )
}
