import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  `w-full font-sans outline-none transition-[border-color,box-shadow,background-color,color] duration-150
   placeholder:text-muted-foreground/70 placeholder:transition-colors
   hover:border-foreground/20
   focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30
   disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-50`,
  {
    variants: {
      variant: {
        default:
          'h-10 px-3 text-[16px] rounded-[6px] bg-card border border-border text-foreground',
        error:
          'h-10 px-3 text-[16px] rounded-[6px] bg-card border border-destructive text-foreground focus-visible:border-destructive focus-visible:ring-destructive/20',
      },
      size: {
        default: '',
        sm: 'h-8 px-2 text-sm rounded',
        lg: 'h-12 px-4 text-lg rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

function Input({ className, variant, size, ...props }: InputProps) {
  return <input className={cn(inputVariants({ variant, size, className }))} {...props} />
}

export { Input, inputVariants }
