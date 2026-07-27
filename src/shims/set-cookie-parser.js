// Local ESM shim for the `set-cookie-parser` package.
// react-router@7.x imports { splitCookiesString } from "set-cookie-parser"
// into the browser bundle, but pnpm's strict layout may cause resolution
// failures. This tiny reimplementation avoids any package.json lookups that
// could trigger EMFILE under ulimit 1024.

/**
 * Split a Set-Cookie header string (or array of strings) into individual
 * cookie strings, correctly handling commas inside cookie values.
 * Based on the set-cookie-parser implementation.
 */
export function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c))
  }
  if (typeof cookiesString !== 'string') {
    return []
  }

  const cookiesStrings = []
  let pos = 0
  let start = 0
  let ch
  let lastComma
  let nextStart
  let cookiesSeparatorFound

  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString[pos])) {
      pos++
    }
    return pos < cookiesString.length
  }

  function notSpecialChar() {
    ch = cookiesString[pos]
    return ch !== '=' && ch !== ';' && ch !== ','
  }

  while (pos < cookiesString.length) {
    if (skipWhitespace()) {
      start = pos
      lastComma = -1
      nextStart = pos
      cookiesSeparatorFound = false

      // Read cookie name
      while (pos < cookiesString.length && notSpecialChar()) {
        pos++
      }

      // Skip '='
      if (pos < cookiesString.length && cookiesString[pos] === '=') {
        pos++
        // Read cookie value (may contain commas)
        let inQuotes = false
        while (pos < cookiesString.length) {
          ch = cookiesString[pos]
          if (ch === '"') inQuotes = !inQuotes
          if (ch === ',' && !inQuotes) {
            lastComma = pos
          }
          if (ch === ';' && !inQuotes) {
            cookiesSeparatorFound = true
            break
          }
          pos++
        }
      }

      // If we found a comma-separator before a semicolon, it's another cookie
      if (lastComma >= nextStart) {
        // This string contains multiple comma-separated cookies
        // Extract them by finding the actual boundaries
        const segment = cookiesString.slice(nextStart)
        // Simple approach: split on commas not inside quotes
        const parts = splitSimple(segment)
        cookiesStrings.push(...parts)
        // Continue after this segment
        if (cookiesSeparatorFound) {
          pos++ // skip ';'
        }
        continue
      }

      if (cookiesSeparatorFound) {
        cookiesStrings.push(cookiesString.slice(start, pos))
        pos++ // skip ';'
        continue
      }

      // End of string
      cookiesStrings.push(cookiesString.slice(start))
      break
    } else {
      break
    }
  }

  return cookiesStrings
}

function splitSimple(str) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (c === '"') inQuotes = !inQuotes
    if (c === ',' && !inQuotes) {
      const trimmed = current.trim()
      if (trimmed) result.push(trimmed)
      current = ''
    } else {
      current += c
    }
  }
  const trimmed = current.trim()
  if (trimmed) result.push(trimmed)
  return result
}

export default { splitCookiesString }
