const MAX_DIMENSION = 1024

/**
 * Fallback decoder: createImageBitmap rejects some formats on some browsers
 * (e.g. certain WebP/EXIF variants) that a plain <img> element can render
 * fine. Decodes via an object URL + <img>, redraws on a canvas, then returns
 * an ImageBitmap of the canvas. Returns null when the file is undecodable.
 */
async function decodeViaImageElement(file: File): Promise<ImageBitmap | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image decode failed'))
      img.src = url
    })
    if (!img.naturalWidth || !img.naturalHeight) return null
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return await createImageBitmap(canvas)
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressImage(file: File, maxSizeMB = 0.5): Promise<File> {
  const targetBytes = maxSizeMB * 1024 * 1024

  // Already small JPEG — skip
  if (file.type === 'image/jpeg' && file.size <= targetBytes) return file

  try {
    let bitmap: ImageBitmap | null
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        colorSpaceConversion: 'default',
      })
    } catch {
      // Fallback decode path for formats createImageBitmap can't handle.
      bitmap = await decodeViaImageElement(file)
    }
    if (!bitmap) return file

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
  } catch (e) {
    console.warn('Image compression failed, using original:', e)
  }

  return file
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}
