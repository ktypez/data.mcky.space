import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  rows?: number
}

export default function TableSkeleton({ rows = 8 }: Props) {
  return (
    <div className="w-full animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b px-4 py-3"
        >
          <Skeleton className="size-5 shrink-0 rounded-[3px]" />
          <Skeleton className="size-10 shrink-0 rounded-[6px]" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32 max-w-[40%]" />
            <Skeleton className="h-3 w-48 max-w-[60%]" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-3 w-20 shrink-0" />
          <div className="flex shrink-0 gap-1.5">
            <Skeleton className="size-6 rounded-[4px]" />
            <Skeleton className="size-6 rounded-[4px]" />
          </div>
        </div>
      ))}
    </div>
  )
}
