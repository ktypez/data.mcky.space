import { useState } from 'react'
import { X, Camera } from '@phosphor-icons/react'
import AppImage from '@/components/AppImage'
import PhotoUploadModal from '@/components/PhotoUploadModal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PhotoSectionProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  uploading?: boolean
  /** Sidecar: full data URL → thumb data URL, for newly added photos. */
  thumbs?: Record<string, string | null>
  onThumbsChange?: (thumbs: Record<string, string | null>) => void
}

const MAX_IMAGES = 2

export default function PhotoSection({ images, onImagesChange, uploading, thumbs, onThumbsChange }: PhotoSectionProps) {
  const [photoModalOpen, setPhotoModalOpen] = useState(false)

  const handleRemove = (i: number) => {
    const removed = images[i]
    onImagesChange(images.filter((_, j) => j !== i))
    // Drop the thumb sidecar so a re-added identical photo can't reuse it.
    if (removed && thumbs && onThumbsChange && removed in thumbs) {
      const next = { ...thumbs }
      delete next[removed]
      onThumbsChange(next)
    }
  }

  return (
    <div className="space-y-1">
      <Label>รูปร้านค้า</Label>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
            {src.startsWith('data:image') || src.startsWith('http') ? (
              <AppImage src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-card flex items-center justify-center text-xs text-muted-foreground">?</div>
            )}
            <Button
              variant="default"
              size="icon-xs"
              className="absolute top-0.5 right-0.5 rounded-full"
              onClick={() => handleRemove(i)}
              disabled={uploading}
              aria-label="ลบรูปภาพ"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <Button
            type="button"
            variant="outline"
            className="w-20 h-20 rounded-lg border-dashed flex flex-col gap-1"
            onClick={() => setPhotoModalOpen(true)}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{images.length}/{MAX_IMAGES}</span>
          </Button>
        )}
      </div>
      <PhotoUploadModal
        open={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        onCompressed={(dataUrl, thumbDataUrl) => {
          onImagesChange([...images, dataUrl])
          if (onThumbsChange) onThumbsChange({ ...(thumbs ?? {}), [dataUrl]: thumbDataUrl })
        }}
      />
    </div>
  )
}