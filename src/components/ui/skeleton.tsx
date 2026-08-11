import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const skeletonVariants = cva(
  `skeleton-shimmer relative overflow-hidden bg-muted`,
  {
    variants: {
      shape: {
        text: 'h-4 rounded-md',
        circle: 'rounded-full',
        card: 'rounded-xl',
      },
    },
    defaultVariants: {
      shape: 'text',
    },
  },
)

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, shape, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(skeletonVariants({ shape, className }))}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }
