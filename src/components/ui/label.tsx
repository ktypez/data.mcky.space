import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-[14px] font-semibold text-muted-foreground',
  {
    variants: {
      required: {
        true: 'after:content-["*"] after:text-destructive after:ml-0.5',
      },
    },
    defaultVariants: {
      required: false,
    },
  }
)

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement>, VariantProps<typeof labelVariants> {}

function Label({ className, required, ...props }: LabelProps) {
  return <label className={cn(labelVariants({ required, className }))} {...props} />
}

export { Label, labelVariants }
