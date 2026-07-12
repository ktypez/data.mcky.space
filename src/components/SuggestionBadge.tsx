import { Lightbulb } from '@phosphor-icons/react'

interface SuggestionBadgeProps {
  size?: 'sm' | 'md'
  className?: string
}

export default function SuggestionBadge({ size = 'sm', className = '' }: SuggestionBadgeProps) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  const border = size === 'sm' ? 'border-2' : 'border-2'

  return (
    <div
      className={`rounded-full bg-[var(--warning)] ${border} border-[var(--card)] p-1 flex items-center justify-center animate-in fade-in zoom-in-75 duration-200 ${className}`}
      title="มีคำแนะนำรอตรวจสอบ"
    >
      <Lightbulb className={`${iconSize} text-white`} weight="fill" />
    </div>
  )
}
