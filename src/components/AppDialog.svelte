<script lang="ts">
  import { X } from 'phosphor-svelte'
  import { type Snippet } from 'svelte'
  import './AppDialog.css'

  let {
    open,
    onClose,
    title,
    children,
    panelClassName = '',
    dialogClassName = '',
    showHeader = true,
    closeLabel = 'ปิด',
    variant = 'dialog',
    lockBody = false,
  }: {
    open: boolean
    onClose: () => void
    title: string
    children: Snippet
    panelClassName?: string
    dialogClassName?: string
    showHeader?: boolean
    closeLabel?: string
    variant?: 'dialog' | 'drawer' | 'lightbox'
    lockBody?: boolean
  } = $props()

  let dialogRef: HTMLDialogElement
  const titleId = `app-dialog-${Math.random().toString(36).slice(2, 9)}`

  $effect(() => {
    const dialog = dialogRef
    if (!dialog) return
    if (open && !dialog.open) {
      const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const previousOverflow = document.body.style.overflow
      if (lockBody) document.body.style.overflow = 'hidden'
      dialog.showModal()
      return () => {
        if (dialog.open) dialog.close()
        if (lockBody) document.body.style.overflow = previousOverflow
        previous?.focus()
      }
    }
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog
  bind:this={dialogRef}
  class="app-dialog app-dialog--{variant} {dialogClassName}"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault()
    onClose()
  }}
  onclick={(event) => {
    if (event.target === dialogRef) onClose()
  }}
>
  <div class="app-dialog-panel {panelClassName}" onclick={(event) => event.stopPropagation()} role="presentation">
    {#if showHeader}
      <div class="app-dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" class="app-dialog-close" onclick={onClose} aria-label={closeLabel}>
          <X size={16} weight="bold" aria-hidden />
        </button>
      </div>
    {:else}
      <h2 id={titleId} class="sr-only">{title}</h2>
    {/if}
    {@render children()}
  </div>
</dialog>
