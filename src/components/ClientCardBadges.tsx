import { Note, CurrencyDollar } from '@phosphor-icons/react'
import SuggestionBadge from '@/components/SuggestionBadge'

interface ClientCardBadgesProps {
  hasNotes: boolean
  hasBadge: boolean
  hasSuggestion: boolean
  size?: 'sm' | 'md'
}

const iconSize = { sm: 'w-2.5 h-2.5', md: 'w-3.5 h-3.5' }
const dotSize = { sm: 'p-0.5', md: 'p-0.5' }

export default function ClientCardBadges({
  hasNotes,
  hasBadge,
  hasSuggestion,
  size = 'sm',
}: ClientCardBadgesProps) {
  const hasAny = hasNotes || hasBadge || hasSuggestion
  if (!hasAny) return null

  return (
    <div className="absolute bottom-0 right-0 z-20 flex flex-row-reverse items-center gap-0.5">
      {hasNotes && (
        <div className={`rounded-full bg-green-500 ${dotSize[size]}`}>
          <Note className={`${iconSize[size]} text-white`} />
        </div>
      )}
      {hasBadge && (
        <div className={`rounded-full bg-[var(--destructive)] ${dotSize[size]}`}>
          <CurrencyDollar className={`${iconSize[size]} text-[var(--destructive-foreground)]`} />
        </div>
      )}
      {hasSuggestion && <SuggestionBadge size="sm" />}
    </div>
  )
}

export function PlaceholderAvatar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--surface-hover)] flex items-center justify-center text-muted-foreground/30 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z" />
      </svg>
    </div>
  )
}
