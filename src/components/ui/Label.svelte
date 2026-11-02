<script lang="ts">
  import { cva, type VariantProps } from 'class-variance-authority'
  import { cn } from '@/lib/utils'
  import type { HTMLLabelAttributes } from 'svelte/elements'
  import type { Snippet } from 'svelte'

  // V5 `.label` — small bold uppercase eyebrow above a control.
  const labelVariants = cva('label', {
    variants: { required: { true: 'after:content-["*"] after:text-danger after:ml-0.5' } },
    defaultVariants: { required: false },
  })

  let { class: className, required, children, ...rest }: HTMLLabelAttributes & VariantProps<typeof labelVariants> & { children?: Snippet } = $props()
</script>

<label class={cn(labelVariants({ required, className }))} {...rest}>
  {@render children?.()}
</label>
