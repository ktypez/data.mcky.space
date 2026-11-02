<script lang="ts">
  import { cva, type VariantProps } from 'class-variance-authority'
  import { cn } from '@/lib/utils'
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  // V5 “paper pop” button: hard-shadow pill. Legacy variant names
  // (default/outline/secondary/destructive/link) stay accepted as aliases
  // so older call sites keep working.
  const buttonVariants = cva(
    `btn`,
    {
      variants: {
        variant: {
          acc: 'btn-acc',
          pop: 'btn-pop',
          ghost: 'btn-ghost',
          danger: 'btn-danger',
          // legacy aliases
          default: 'btn-acc',
          outline: 'btn-pop',
          secondary: 'btn-pop',
          destructive: 'btn-danger',
          link: 'btn-ghost',
        },
        size: {
          default: '',
          sm: '!px-3.5 !py-2 text-[13px]',
          xs: '!px-3 !py-1.5 text-[12.5px]',
          lg: '!px-5 !py-3',
          icon: '!p-0 size-11',
          'icon-sm': '!p-0 size-9',
          'icon-xs': '!p-0 size-7',
        },
      },
      defaultVariants: { variant: 'acc', size: 'default' },
    },
  )

  let {
    class: className,
    variant,
    size,
    children,
    ...rest
  }: HTMLButtonAttributes & VariantProps<typeof buttonVariants> & { children?: Snippet } = $props()
</script>

<button data-slot="button" class={cn(buttonVariants({ variant, size, className }))} {...rest}>
  {@render children?.()}
</button>
