import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        interactive &&
          'cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10 active:translate-y-0 active:scale-[0.99] active:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-content" className={cn('p-4 pt-0', className)} {...props} />
  )
}

function CardAction({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'flex items-center gap-2 border-t px-4 py-3',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardContent, CardAction }
