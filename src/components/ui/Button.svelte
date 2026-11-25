<script lang="ts">
  import { cn } from '@/lib/utils'
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Variant = 'acc' | 'pop' | 'ghost' | 'danger' | 'default' | 'outline' | 'secondary' | 'destructive' | 'link'
  type Size = 'default' | 'sm' | 'xs' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs'

  const sizes: Record<Size, string> = {
    default: '', sm: '!px-3.5 !py-2 text-[13px]', xs: '!px-3 !py-1.5 text-[12.5px]',
    lg: '!px-5 !py-3', icon: '!p-0 size-11', 'icon-sm': '!p-0 size-9', 'icon-xs': '!p-0 size-7',
  }

  let {
    class: className = '', variant = 'acc', size = 'default', type = 'button', children, ...rest
  }: Omit<HTMLButtonAttributes, 'type'> & { type?: 'button' | 'submit' | 'reset'; class?: string; variant?: Variant; size?: Size; children?: Snippet } = $props()

  let variantClass = $derived(variant === 'outline' ? 'ui-button--outline' : variant === 'secondary' ? 'ui-button--secondary' : '')
  let sharedClass = $derived(cn('ui-button', sizes[size], variantClass, className))
</script>

<button class={sharedClass} {type} {...rest}>
  {@render children?.()}
</button>

<style>
  :global(.ui-button) { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid transparent; border-radius: 999px; padding: 10px 18px; min-height: 40px; color: var(--ink); background: var(--card); font: 600 14px/1 var(--font-ui); cursor: pointer; transition: transform var(--mochi-duration-fast) var(--mochi-ease-spring), box-shadow var(--mochi-duration) var(--mochi-ease-out), background var(--mochi-duration) var(--mochi-ease-out); }
  :global(.ui-button:hover:not(:disabled)) { transform: translateY(-1px); }
  :global(.ui-button:active:not(:disabled)) { transform: scale(.97); }
  :global(.ui-button:disabled) { opacity: .5; cursor: not-allowed; }
  :global(.ui-button:not(.ui-button--outline, .ui-button--secondary)) { background: var(--acc); color: var(--on-accent); border-color: color-mix(in srgb, var(--acc) 70%, var(--ink)); box-shadow: 0 2px 0 color-mix(in srgb, var(--acc) 42%, var(--ink)); }
  :global(.ui-button:not(.ui-button--outline, .ui-button--secondary):hover:not(:disabled)) { background: var(--acc-strong); }
  :global(.ui-button--outline) { background: var(--card); border-color: var(--rule-2); box-shadow: var(--sh-sm); }
  :global(.ui-button--secondary) { background: var(--paper-2); border-color: var(--rule); }
</style>
