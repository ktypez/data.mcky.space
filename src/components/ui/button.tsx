import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap select-none outline-none
   transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out
   hover:-translate-y-px
   active:translate-y-0 active:scale-[0.97] active:duration-75
   focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background
   disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50
   [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-md active:shadow-xs',
        outline:
          'border-border bg-background text-foreground shadow-xs hover:bg-muted hover:text-foreground hover:shadow-sm aria-expanded:bg-muted',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 hover:shadow-sm',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted shadow-none hover:shadow-none',
        destructive:
          'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 hover:border-destructive/40',
        link: 'text-primary shadow-none underline-offset-4 hover:!translate-y-0 hover:shadow-none hover:underline active:!scale-100',
      },
      size: {
        default: 'h-8 gap-1.5 px-3',
        xs: 'h-6 gap-1 rounded-md px-2 text-xs',
        sm: 'h-7 gap-1 rounded-md px-2.5 text-[0.8rem]',
        lg: 'h-9 gap-1.5 px-4',
        icon: 'size-8',
        'icon-xs': 'size-6 rounded-md',
        'icon-sm': 'size-7 rounded-md',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
