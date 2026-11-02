<script lang="ts">
  import { cva, type VariantProps } from 'class-variance-authority'
  import { cn } from '@/lib/utils'
  import { trackField } from '@/lib/restore-field'
  import type { HTMLInputAttributes } from 'svelte/elements'

  // V5 `.field` — card fill, hard rule border, accent focus ring.
  const inputVariants = cva('field', {
    variants: {
      variant: { default: '', error: '!border-danger' },
      size: { default: '', sm: '!py-1.5 text-[13px]', lg: '!py-3' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  })

  let {
    class: className,
    variant,
    size,
    syncValue,
    ...rest
  }: HTMLInputAttributes & VariantProps<typeof inputVariants> & { syncValue?: () => string } = $props()
</script>

<input
  class={cn(inputVariants({ variant, size, className }))}
  use:trackField={syncValue}
  {...rest}
/>
