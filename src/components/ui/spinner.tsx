import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const spinnerVariants = cva('animate-spin-slow text-muted-foreground', {
  variants: {
    size: {
      sm: 'size-3',
      md: 'size-4',
      lg: 'size-6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
}

function Spinner({ className, size }: SpinnerProps) {
  const pxSize = size === 'sm' ? 12 : size === 'lg' ? 24 : 16
  return (
    <svg
      className={cn(spinnerVariants({ size, className }))}
      width={pxSize}
      height={pxSize}
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M14 8A6 6 0 0 0 2 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export { Spinner, spinnerVariants }
export default Spinner
