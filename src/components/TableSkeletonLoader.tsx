/**
 * Skeleton shown while the initial client list is loading.
 * Mirrors the desktop table layout so the layout doesn't jump when
 * real rows land.
 */
export function TableSkeletonLoader() {
  return (
    <div className="animate-fade-in">
      <div className="flex h-10 animate-fade-in items-center gap-2 border-b bg-card px-4">
        <div className="size-5 animate-pulse-soft rounded bg-muted" />
        <div className="size-5 animate-pulse-soft rounded bg-muted" />
        <div className="flex-1" />
        <div className="h-6 w-16 animate-pulse-soft rounded bg-muted" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="size-5 animate-pulse-soft rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse-soft rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse-soft rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
