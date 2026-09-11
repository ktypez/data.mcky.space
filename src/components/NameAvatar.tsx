import { House } from '@phosphor-icons/react'

interface NameAvatarProps {
  className?: string
}

export default function NameAvatar({ className = '' }: NameAvatarProps) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ${className}`}>
      <House className="h-4 w-4" weight="fill" />
    </span>
  )
}
