<script lang="ts">
  import { untrack } from 'svelte'

  let {
    src,
    alt,
    fallbackSrc,
    onerror,
    className,
    ...rest
  }: {
    src: string
    alt: string
    fallbackSrc?: string
    className?: string
    onerror?: (e: Event & { currentTarget: Element }) => void
    [key: string]: unknown
  } = $props()

  let current = $state(untrack(() => src))
  let prevSrc = $state(untrack(() => src))
  $effect(() => {
    if (src !== prevSrc) {
      prevSrc = src
      current = src
    }
  })
</script>

<img
  src={current}
  {alt}
  loading="lazy"
  decoding="async"
  class={className}
  onerror={(e) => {
    if (fallbackSrc && current !== fallbackSrc) current = fallbackSrc
    onerror?.(e)
  }}
  {...rest}
/>
