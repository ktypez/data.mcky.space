// Local ESM shim for the `clsx` package.
// Avoids pnpm symlink resolution that can trigger EMFILE under ulimit 1024.
// The original clsx is browser-safe; this is a faithful reimplementation.

function toVal(mix) {
  let str = ''
  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix
  } else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      for (let i = 0; i < mix.length; i++) {
        if (mix[i]) {
          const x = toVal(mix[i])
          if (x) {
            if (str) str += ' '
            str += x
          }
        }
      }
    } else {
      for (const key in mix) {
        if (mix[key]) {
          if (str) str += ' '
          str += key
        }
      }
    }
  }
  return str
}

export default function clsx(...args) {
  let str = ''
  for (let i = 0; i < args.length; i++) {
    if (args[i]) {
      const x = toVal(args[i])
      if (x) {
        if (str) str += ' '
        str += x
      }
    }
  }
  return str
}

export { clsx }
