<script lang="ts">
  import { X, Camera } from 'phosphor-svelte'
  import AppImage from '@/components/AppImage.svelte'
  import PhotoUploadModal from '@/components/PhotoUploadModal.svelte'
  import Button from '@/components/ui/Button.svelte'
  import Label from '@/components/ui/Label.svelte'

  let {
    images,
    onImagesChange,
    uploading,
    thumbs,
    onThumbsChange,
  }: {
    images: string[]
    onImagesChange: (images: string[]) => void
    uploading?: boolean
    thumbs?: Record<string, string | null>
    onThumbsChange?: (thumbs: Record<string, string | null>) => void
  } = $props()

  let photoModalOpen = $state(false)
  const MAX_IMAGES = 2

  const handleRemove = (i: number) => {
    const removed = images[i]
    onImagesChange(images.filter((_, j) => j !== i))
    if (removed && thumbs && onThumbsChange && removed in thumbs) {
      const next = { ...thumbs }
      delete next[removed]
      onThumbsChange(next)
    }
  }
</script>

<div class="space-y-1">
  <Label id="photo-section-label">รูปร้านค้า</Label>
  <div class="flex flex-wrap gap-2">
    {#each images as src, i}
      <div class="sticker relative size-20 overflow-hidden rounded-xl p-0.5">
        {#if src.startsWith('data:image') || src.startsWith('http')}
          <AppImage {src} alt={`รูปที่ ${i + 1}`} className="size-full rounded-lg object-cover" />
        {:else}
          <div class="flex size-full items-center justify-center rounded-lg bg-paper-2 text-xs text-ink-faint">?</div>
        {/if}
        <Button type="button" variant="danger" size="icon-xs" class="absolute right-1 top-1 rounded-full" onclick={() => handleRemove(i)} disabled={uploading} aria-label="ลบรูปภาพ">
          <X class="w-3 h-3" aria-hidden="true" />
        </Button>
      </div>
    {/each}
    {#if images.length < MAX_IMAGES}
      <Button type="button" variant="pop" class="size-20 flex-col gap-1 rounded-xl border-dashed" onclick={() => (photoModalOpen = true)}>
        <Camera class="w-5 h-5" />
        <span class="text-[10px] font-semibold">{images.length}/{MAX_IMAGES}</span>
      </Button>
    {/if}
  </div>
  <PhotoUploadModal
    open={photoModalOpen}
    onOpenChange={(v) => (photoModalOpen = v)}
    onCompressed={(dataUrl, thumbDataUrl) => {
      onImagesChange([...images, dataUrl])
      if (onThumbsChange) onThumbsChange({ ...(thumbs ?? {}), [dataUrl]: thumbDataUrl })
    }}
  />
</div>
