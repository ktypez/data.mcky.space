async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 512,
  )
  return new Uint8Array(bits)
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(password, salt)
  return `${toHex(salt)}:${toHex(hash)}`
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const idx = stored.indexOf(':')
  if (idx === -1) return false
  const salt = fromHex(stored.slice(0, idx))
  const hash = fromHex(stored.slice(idx + 1))
  const derived = await pbkdf2(password, salt)
  return timingSafeEqual(derived, hash)
}

export async function createToken(secretHex: string): Promise<string> {
  const timestamp = Date.now().toString()
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', fromHex(secretHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(timestamp))
  return `${timestamp}.${toHex(new Uint8Array(sig))}`
}

export async function verifyToken(token: string, secretHex: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [timestamp, signature] = parts
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', fromHex(secretHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(timestamp)))
  const expected = fromHex(signature)
  if (!timingSafeEqual(sig, expected)) return false

  return Date.now() - ts < 30 * 24 * 60 * 60 * 1000
}

export function getTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)ezzylist_token=([^;]*)/)
  if (match) return decodeURIComponent(match[1])
  return request.headers.get('x-admin-token')
}
