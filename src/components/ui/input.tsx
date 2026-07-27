import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  'w-full font-sans outline-none transition-colors placeholder:text-muted-foreground',
  {
    variants: {
      variant: {
        default:
          'h-10 px-3 text-[16px] rounded-[6px] bg-card border border-border text-muted-foreground focus:border-ring',
        error:
          'h-10 px-3 text-[16px] rounded-[6px] bg-card border border-destructive text-muted-foreground focus:border-destructive',
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
