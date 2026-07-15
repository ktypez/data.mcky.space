const MAX_DIMENSION = 2048

function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  const name = file.name.toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif')
}

export async function compressImage(file: File, maxSizeMB = 3): Promise<File> {
  try {
    const img = await loadImage(file)

    let { width, height } = img
    const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION
    const needsCompress = file.size > maxSizeMB * 1024 * 1024
    const isHeic = isHeicFile(file)

    // Skip canvas for non-HEIC files that are already small enough
    if (!isHeic && !needsResize && !needsCompress) {
      return file
    }

    if (needsResize) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, width, height)

    // HEIC/HEIF images may draw as all-black on canvas — detect and bail
    if (isHeic && isCanvasBlack(canvas)) {
      console.warn('Canvas output is black (HEIC/HEIF not supported by canvas), using original file')
      return file
    }

    // Binary search for optimal quality
    const targetBytes = maxSizeMB * 1024 * 1024
    let lo = 0.1, hi = 0.9
    let blob: Blob | null = null
    for (let i = 0; i < 6; i++) {
      const mid = Math.round((lo + hi) * 10) / 10
      blob = await canvasToBlob(canvas, 'image/jpeg', mid)
      if (blob && blob.size > targetBytes) {
        hi = mid - 0.1
      } else {
        lo = mid
      }
      if (blob && blob.size <= targetBytes && mid >= 0.8) break
    }
    if (!blob || blob.size > targetBytes) {
      // Last resort: downscale
      const ratio = Math.sqrt((targetBytes) / (blob?.size || targetBytes))
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height)
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.7)
    }

    return new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
  } catch (e) {
    console.warn('Image compression failed, using original', e)
    return file
  }
}

function isCanvasBlack(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!
  const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 10))
  for (let x = 0; x < canvas.width; x += step) {
    for (let y = 0; y < canvas.height; y += step) {
      const pixel = ctx.getImageData(x, y, 1, 1).data
      if (pixel[0] > 3 || pixel[1] > 3 || pixel[2] > 3) return false
    }
  }
  return true
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}
