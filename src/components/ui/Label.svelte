<script lang="ts">
  import { cva, type VariantProps } from 'class-variance-authority'
  import { cn } from '@/lib/utils'
  import type { HTMLLabelAttributes } from 'svelte/elements'
  import type { Snippet } from 'svelte'

  const labelVariants = cva('text-[14px] font-semibold text-muted-foreground', {
    variants: { required: { true: 'after:content-["*"] after:text-destructive after:ml-0.5' } },
    defaultVariants: { required: false },
  })

  let { class: className, required, children, ...rest }: HTMLLabelAttributes & VariantProps<typeof labelVariants> & { children?: Snippet } = $props()
</script>

<label class={cn(labelVariants({ required, className }))} {...rest}>
  {@render children?.()}
</label>
