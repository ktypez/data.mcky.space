interface AppImageProps {
  src: string
  alt: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export default function AppImage({ src, alt, className, onClick }: AppImageProps) {
  return <img src={src} alt={alt} className={className} onClick={onClick} loading="lazy" />
}
