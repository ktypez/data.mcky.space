import { useState } from 'react'

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  /** One-time fallback (e.g. full-size photo) if `src` 404s — used for
   *  list thumbnails of photos uploaded before thumbs existed. */
  fallbackSrc?: string
}

export default function AppImage({ src, alt, fallbackSrc, onError, ...rest }: AppImageProps) {
  const [current, setCurrent] = useState(src)
  // Reset when the parent switches to a different photo.
  const [prevSrc, setPrevSrc] = useState(src)
  if (src !== prevSrc) {
    setPrevSrc(src)
    setCurrent(src)
  }
  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc)
        }
        onError?.(e)
      }}
      {...rest}
    />
  )
}
