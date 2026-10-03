import { lazy, Suspense } from 'react'
import type { ComponentType, ComponentProps } from 'react'

/** Generic lazy loading utility with optional custom fallback. */
export function lazyLoad<T extends ComponentType<any>>(
  imp: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const Lazy = lazy(imp)
  return (props: ComponentProps<T>) => (
    <Suspense fallback={fallback ?? null}>
      <Lazy {...props} />
    </Suspense>
  )
}
