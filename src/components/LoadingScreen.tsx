import { Skeleton } from '@/components/ui/skeleton'
import TableSkeleton from '@/components/TableSkeleton'

export default function LoadingScreen() {
 return (
 <div className="min-h-screen bg-background flex font-display animate-in fade-in duration-300">
 {/* Sidebar skeleton */}
 <div className="w-[220px] h-screen bg-card flex flex-col shrink-0 border-r border-border max-md:hidden">
 <div className="h-12 flex items-center px-3.5 border-b border-border">
 <Skeleton className="w-20 h-5" />
 </div>
 <div className="flex-1 px-2 py-2.5 space-y-1">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="flex items-center gap-2.5 px-3 py-2">
 <Skeleton className="w-4 h-4 rounded shrink-0" />
 <Skeleton className="h-3.5 flex-1" />
 {i < 4 && <Skeleton className="w-6 h-4 rounded-full" />}
 </div>
 ))}
 </div>
 </div>

 {/* Main content skeleton */}
 <div className="flex-1 min-w-0 flex flex-col min-h-screen">
 {/* Header skeleton */}
 <div className="h-14 bg-card flex items-center gap-3 px-4 border-b border-border">
 <Skeleton className="w-20 h-5 max-md:hidden" />
 <Skeleton className="w-9 h-9 rounded-[4px] md:hidden" />
 <div className="flex-1">
 <Skeleton className="h-9 w-full rounded-[4px]" />
 </div>
 </div>

 {/* Toolbar skeleton */}
 <div className="h-10 bg-card border-b border-border flex items-center gap-2 px-4">
 <Skeleton className="h-5 w-5 rounded" />
 <Skeleton className="h-5 w-5 rounded" />
 <div className="flex-1" />
 <Skeleton className="h-6 w-16 rounded" />
 </div>

 {/* Table skeleton */}
 <div className="flex-1">
 <TableSkeleton rows={8} />
 </div>
 </div>
 </div>
 )
}
