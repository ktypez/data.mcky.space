'use client'

import { useRef } from 'react'
import { X, Camera } from '@phosphor-icons/react'
import AppImage from '@/components/AppImage'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/compressImage'

const MAX_PHOTOS = 2

interface Props {
  images: string[]
  onChange: (images: string[]) => void
}

export default function ImageUpload({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (images.length >= MAX_PHOTOS) return
    const file = files[0]
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return

    compressImage(file).then((compressed) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const resized = e.target?.result as string
        const next = [...images, resized]
        onChange(next.slice(0, MAX_PHOTOS))
      }
      reader.readAsDataURL(compressed)
    })
  }

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div
            key={i}
            className="relative w-28 h-28 rounded-lg overflow-hidden border border-border group cursor-pointer"
          >
            <div onClick={() => inputRef.current?.click()}>
              {(src.startsWith('data:image') || src.startsWith('http')) ? (
                <AppImage src={src} alt={`Shop photo ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  ?
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
              <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <Button
              variant="default"
              size="icon-xs"
              className="absolute top-0.5 right-0.5 rounded-full"
              onClick={() => removeImage(i)}
              aria-label="ลบรูปภาพ"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}

        {images.length < MAX_PHOTOS && (
          <Button
            type="button"
            variant="outline"
            className="w-28 h-28 rounded-lg border-dashed flex flex-col gap-1"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs font-semibold">{images.length}/{MAX_PHOTOS}</span>
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
