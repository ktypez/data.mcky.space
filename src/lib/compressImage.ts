const MAX_DIMENSION = 1024

export async function compressImage(file: File, maxSizeMB = 0.5): Promise<File> {
  const targetBytes = maxSizeMB * 1024 * 1024

  // Already small JPEG — skip
  if (file.type === 'image/jpeg' && file.size <= targetBytes) return file

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      colorSpaceConversion: 'default',
    })

    let w = bitmap.width, h = bitmap.height
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const r = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h)
      w = Math.round(w * r)
      h = Math.round(h * r)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    let lo = 0.1, hi = 0.7, blob: Blob | null = null
    for (let i = 0; i < 6; i++) {
      const mid = Math.round((lo + hi) * 10) / 10
      blob = await canvasToBlob(canvas, 'image/jpeg', mid)
      if (blob && blob.size > targetBytes) hi = mid - 0.1
      else lo = mid
      if (blob && blob.size <= targetBytes) break
    }

    if (blob) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
    }
  } catch {}

  return file
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}
