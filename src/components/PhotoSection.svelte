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
      <div class="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
        {#if src.startsWith('data:image') || src.startsWith('http')}
          <AppImage {src} alt={`รูปที่ ${i + 1}`} className="w-full h-full object-cover" />
        {:else}
          <div class="w-full h-full bg-card flex items-center justify-center text-xs text-muted-foreground">?</div>
        {/if}
        <Button type="button" variant="default" size="icon" class="absolute right-0.5 top-0.5 !h-11 !w-11 rounded-full" onclick={() => handleRemove(i)} disabled={uploading} aria-label="ลบรูปภาพ">
          <X class="w-3 h-3" aria-hidden />
        </Button>
      </div>
    {/each}
    {#if images.length < MAX_IMAGES}
      <Button type="button" variant="outline" class="w-20 h-20 rounded-lg border-dashed flex flex-col gap-1" onclick={() => (photoModalOpen = true)}>
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
