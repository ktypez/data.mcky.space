import { useEffect } from 'react'
import Lightbox from '@/components/Lightbox'

interface V2LightboxProps {
  images: string[]
  index: number
  onClose: () => void
  onIndexChange: (i: number) => void
}

/**
 * V2Lightbox — v2 wrapper around the shared Lightbox (which has no
 * keyboard support and lets the page scroll behind it):
 * - Escape closes, ArrowLeft/ArrowRight step photos
 * - body scroll is locked while open, restored on close
 *
 * The shared component itself is untouched, so the classic UI is unaffected.
 */
export default function V2Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: V2LightboxProps) {
  const hasMultiple = images.length > 1

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (hasMultiple && e.key === 'ArrowRight') {
        onIndexChange((index + 1) % images.length)
      } else if (hasMultiple && e.key === 'ArrowLeft') {
        onIndexChange((index - 1 + images.length) % images.length)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [index, images.length, hasMultiple, onClose, onIndexChange])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <Lightbox
      images={images}
      index={index}
      onClose={onClose}
      onIndexChange={onIndexChange}
    />
  )
}
