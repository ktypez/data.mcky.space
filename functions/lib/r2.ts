function isBase64(s: string): boolean {
  return s.startsWith('data:image')
}

export function isR2Url(s: string): boolean {
  return s.startsWith('http') && !s.startsWith('data:')
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadError'
  }
}

export async function uploadImage(
  bucket: R2Bucket,
  publicUrl: string,
  clientId: string,
  imageData: string,
): Promise<string> {
  if (isR2Url(imageData)) return imageData
  if (!isBase64(imageData)) return imageData

  const match = imageData.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) {
    throw new UploadError('Invalid base64 image format')
  }

  const ext = match[1].split('/')[1] === 'jpeg' ? 'jpg' : match[1].split('/')[1]
  const binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
  const key = `clients/${clientId}/${Date.now()}.${ext}`

  try {
    await bucket.put(key, binary, { httpMetadata: { contentType: match[1] } })
  } catch (e) {
    throw new UploadError(`R2 put failed: ${e instanceof Error ? e.message : String(e)}`)
  }
  return `${publicUrl}/${key}`
}

export async function deleteImage(bucket: R2Bucket, publicUrl: string, url: string): Promise<void> {
  if (!publicUrl || !url.includes(publicUrl)) return
  const key = url.replace(`${publicUrl}/`, '')
  await bucket.delete(key)
}

export async function deleteClientImages(
  bucket: R2Bucket,
  publicUrl: string,
  urls: string[],
): Promise<void> {
  await Promise.all(urls.filter(isR2Url).map((url) => deleteImage(bucket, publicUrl, url)))
}

export async function uploadClientImages(
  bucket: R2Bucket,
  publicUrl: string,
  clientId: string,
  images: string[],
): Promise<string[]> {
  // C2 fix: previously used Promise.allSettled and returned the original
  // base64 on failure, which leaked raw base64 into D1 rows. Now any
  // upload failure throws — callers must not persist partial state.
  return await Promise.all(
    images.map((img) => uploadImage(bucket, publicUrl, clientId, img)),
  )
}
