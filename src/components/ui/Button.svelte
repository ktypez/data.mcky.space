<script lang="ts">
  import SharedButton from '@mcky/ui/button'
  import { cn } from '@/lib/utils'
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Variant = 'acc' | 'pop' | 'ghost' | 'danger' | 'default' | 'outline' | 'secondary' | 'destructive' | 'link'
  type Size = 'default' | 'sm' | 'xs' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs'

  const variants: Record<Variant, 'primary' | 'secondary' | 'ghost' | 'pop' | 'danger'> = {
    acc: 'primary', default: 'primary', pop: 'pop', ghost: 'ghost', danger: 'danger',
    outline: 'secondary', secondary: 'secondary', destructive: 'danger', link: 'ghost',
  }
  const sizes: Record<Size, string> = {
    default: '', sm: '!px-3.5 !py-2 text-[13px]', xs: '!px-3 !py-1.5 text-[12.5px]',
    lg: '!px-5 !py-3', icon: '!p-0 size-11', 'icon-sm': '!p-0 size-9', 'icon-xs': '!p-0 size-7',
  }

  let {
    class: className = '', variant = 'acc', size = 'default', type = 'button', children, ...rest
  }: Omit<HTMLButtonAttributes, 'type'> & { type?: 'button' | 'submit' | 'reset'; class?: string; variant?: Variant; size?: Size; children?: Snippet } = $props()

  let sharedVariant = $derived(variants[variant])
  let variantClass = $derived(variant === 'outline' ? 'ui-button--outline' : variant === 'secondary' ? 'ui-button--secondary' : '')
  let sharedClass = $derived(cn(sizes[size], variantClass, className))
</script>

<SharedButton variant={sharedVariant} {type} class={sharedClass} {...rest}>
  {@render children?.()}
</SharedButton>

<style>
  :global(.ui-button--outline) { background: var(--card); border-color: var(--rule-2); box-shadow: var(--sh-sm); }
  :global(.ui-button--secondary) { background: var(--paper-2); border-color: var(--rule); }
</style>
