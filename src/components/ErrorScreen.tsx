'use client'

import { WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface ErrorScreenProps {
  onRetry: () => void
}

export default function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <WarningCircle size={28} className="text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load data</p>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}
