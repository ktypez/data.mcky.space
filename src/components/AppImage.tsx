interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
}

export default function AppImage({ src, alt, ...rest }: AppImageProps) {
  return <img src={src} alt={alt} loading="lazy" decoding="async" {...rest} />
}
