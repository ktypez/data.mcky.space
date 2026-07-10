'use client'

import { WarningCircle } from '@phosphor-icons/react'

interface ErrorScreenProps {
  message?: string
  onRetry?: () => void
}

export function ErrorScreen({
  message = 'Something went wrong',
  onRetry,
}: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <WarningCircle size={32} className="text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/85"
        >
          Try again
        </button>
      )}
    </div>
  )
}
