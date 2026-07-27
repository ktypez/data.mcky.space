import { useState, useEffect, useRef } from 'react'
import { useSwipe } from '@/hooks/useSwipe'
import AppImage from '@/components/AppImage'

interface ClientPhotoGalleryProps {
  images: string[]
  onLightboxOpen: (index: number) => void
}

export default function ClientPhotoGallery({ images, onLightboxOpen }: ClientPhotoGalleryProps) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [imageSizes, setImageSizes] = useState<Record<string, number>>({})
  const fetchedUrls = useRef(new Set<string>())
  const [prevLen, setPrevLen] = useState(images.length)

  // Reset photoIdx when images array changes
  if (images.length !== prevLen) {
    setPrevLen(images.length)
    setPhotoIdx(0)
  }

  useEffect(() => {
    for (const src of images) {
      if (fetchedUrls.current.has(src)) continue
      fetchedUrls.current.add(src)
      fetch(src, { method: 'HEAD' })
        .then((r) => {
          const len = r.headers.get('Content-Length')
          if (len) setImageSizes((prev) => ({ ...prev, [src]: Number(len) }))
        })
        .catch(() => {})
    }
  }, [images])

  const cardSwipe = useSwipe(
    () => { if (photoIdx < images.length - 1) setPhotoIdx(photoIdx + 1) },
    () => { if (photoIdx > 0) setPhotoIdx(photoIdx - 1) },
  )

  if (images.length === 0) return null

  return (
    <div className="flex-1 flex flex-col gap-0">
      <div
        {...cardSwipe}
        className="aspect-square md:aspect-[2/1] rounded-[10px] overflow-hidden relative touch-pan-y"
      >
        {(() => {
          const src = images[photoIdx]
          const size = imageSizes[src]
          return size != null ? (
            <div className="absolute bottom-2 left-2 z-10 pointer-events-none inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[12px] font-medium bg-black/60 text-white">
              {size < 1024 * 1024
                ? `${(size / 1024).toFixed(0)} KB`
                : `${(size / (1024 * 1024)).toFixed(1)} MB`}
            </div>
          ) : null
        })()}
        <div
          className={`flex h-full will-change-transform ${cardSwipe.isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
          style={{ transform: `translateX(calc(-${photoIdx * 100}% + ${cardSwipe.dragOffset}px))` }}
        >
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => onLightboxOpen(i)}
              className="min-w-full h-full overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
            >
              <AppImage
                src={src}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-auto">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setPhotoIdx(i) }}
                className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  i === photoIdx
                    ? 'bg-foreground w-5'
                    : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
