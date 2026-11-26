// Local ESM shim for the `cookie` package.
// react-router@7.x imports { parse, serialize } from "cookie" into the browser
// bundle, but pnpm's strict layout hides the deep copy and the root hoist is
// cookie@2.x which dropped those named exports. Aliasing the folder caused
// EMFILE (ulimit 1024) from repeated package.json stat calls, so we re-implement
// the tiny, stable parse/serialize API locally — no extra file opens at build.
export function parse(str, options) {
  if (typeof str !== 'string') return {}
  const opt = options || {}
  const pairs = str.split(/; */)
  const obj = {}
  for (const pair of pairs) {
    const idx = pair.indexOf('=')
    if (idx < 0) continue
    const key = pair.slice(0, idx).trim()
    if (!key) continue
    let val = pair.slice(idx + 1).trim()
    if (val.charCodeAt(0) === 0x22 && val.charCodeAt(val.length - 1) === 0x22) {
      val = val.slice(1, -1)
    }
    if (Object.prototype.hasOwnProperty.call(obj, key) && !opt.decode) continue
    try {
      obj[key] = opt.decode ? opt.decode(val) : decodeURIComponent(val)
    } catch {
      obj[key] = val
    }
  }
  return obj
}

export function serialize(name, val, options) {
  const opt = options || {}
  const enc = opt.encode || encodeURIComponent
  let str = `${name}=${enc(val)}`
  if (opt.maxAge != null) str += `; Max-Age=${Math.floor(opt.maxAge)}`
  if (opt.domain) str += `; Domain=${opt.domain}`
  if (opt.path) str += `; Path=${opt.path}`
  if (opt.expires) str += `; Expires=${opt.expires.toUTCString()}`
  if (opt.httpOnly) str += '; HttpOnly'
  if (opt.secure) str += '; Secure'
  if (opt.sameSite) {
    const s = String(opt.sameSite).toLowerCase()
    if (s === 'true' || s === 'strict') str += '; SameSite=Strict'
    else if (s === 'lax') str += '; SameSite=Lax'
    else if (s === 'none') str += '; SameSite=None'
  }
  return str
}

export default { parse, serialize }
