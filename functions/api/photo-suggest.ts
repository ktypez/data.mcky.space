import { uploadClientImages } from '../lib/r2'

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { env, request } = context
  const formData = await request.formData()
  const file = formData.get('image') as File | null
  const clientId = formData.get('clientId') as string | null

  if (!file || !clientId) {
    return new Response(JSON.stringify({ error: 'Missing image or clientId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const arrayBuf = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuf)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  const base64 = btoa(binary)
  const mime = file.type || 'application/octet-stream'
  const dataUrl = `data:${mime};base64,${base64}`

  const urls = await uploadClientImages(env.BUCKET, env.R2_PUBLIC_URL, clientId, [dataUrl])
  if (urls.length > 0 && urls[0].startsWith('http')) {
    return new Response(JSON.stringify({ url: urls[0] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ error: 'Upload failed' }), {
    status: 500, headers: { 'Content-Type': 'application/json' },
  })
}
