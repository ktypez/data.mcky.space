const MAX_DIMENSION = 2048

export async function compressImage(file: File, maxSizeMB = 3): Promise<File> {
  try {
    const img = await loadImage(file)

    let { width, height } = img
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size <= maxSizeMB * 1024 * 1024) {
      return file
    }

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, width, height)

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
