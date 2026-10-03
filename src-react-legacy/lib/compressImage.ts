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

/**
 * Tiny JPEG data URL (default 96px) for list thumbnails. Generated
 * client-side next to the full upload so the catalog never downloads
 * 0.5MB files into 32px circles. Returns null when undecodable.
 */
export async function makeThumbDataUrl(source: File | string, size = 96): Promise<string | null> {
  try {
    let bitmap: ImageBitmap | null = null
    if (typeof source === 'string') {
      const res = await fetch(source)
      const blob = await res.blob()
      try {
        bitmap = await createImageBitmap(blob)
      } catch {
        bitmap = null
      }
    } else {
      try {
        bitmap = await createImageBitmap(source)
      } catch {
        bitmap = await decodeViaImageElement(source)
      }
    }
    if (!bitmap) return null
    const r = Math.min(size / bitmap.width, size / bitmap.height, 1)
    const w = Math.max(1, Math.round(bitmap.width * r))
    const h = Math.max(1, Math.round(bitmap.height * r))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.6)
    if (!blob) return null
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}
