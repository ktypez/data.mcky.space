function isBase64(s: string): boolean {
  return s.startsWith('data:image')
}

export function isR2Url(s: string): boolean {
  return s.startsWith('http') && !s.startsWith('data:')
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
  if (!match) return imageData

  const ext = match[1].split('/')[1] === 'jpeg' ? 'jpg' : match[1].split('/')[1]
  const binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
  const key = `clients/${clientId}/${Date.now()}.${ext}`

  await bucket.put(key, binary, { httpMetadata: { contentType: match[1] } })
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
  const results = await Promise.allSettled(
    images.map((img) => uploadImage(bucket, publicUrl, clientId, img)),
  )
  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : images[i]))
}
