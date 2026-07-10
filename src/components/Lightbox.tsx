'use client'

import { CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

type Props = {
  images: string[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}

export default function Lightbox({ images, index, onClose, onIndexChange }: Props) {
  const hasMultiple = images.length > 1

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center touch-pan-y p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center max-w-[92vw] max-h-[90vh]"
      >
        <div className="relative rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt="Enlarged photo"
            className="max-w-[85vw] max-h-[70vh] object-contain"
          />
        </div>

        {hasMultiple && (
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/10 hover:bg-white/25 text-white w-11 h-11"
              onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
              aria-label="Previous photo"
            >
              <CaretLeft className="w-5 h-5" weight="bold" />
            </Button>

            <div className="flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onIndexChange(i)}
                  className={`h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                    i === index ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50 w-2.5'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/10 hover:bg-white/25 text-white w-11 h-11"
              onClick={() => onIndexChange((index + 1) % images.length)}
              aria-label="Next photo"
            >
              <CaretRight className="w-5 h-5" weight="bold" />
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 md:top-0 md:right-0 z-20 rounded-full bg-white/10 hover:bg-white/25 text-white w-11 h-11"
          onClick={onClose}
          aria-label="ปิดภาพ"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
