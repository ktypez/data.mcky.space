import type { Action } from 'svelte/action'

/**
 * Keep form fields honest when the page comes back.
 *
 * Mobile browsers restore form controls on their own — session restore after
 * the app was killed, PWA resume, the back/forward cache — and that fires no
 * input event. A field then shows one value while the store holds another:
 * a search box that no longer matches the list it filters, or an editor whose
 * visible text differs from what will be saved.
 *
 * Register a field with a getter for its value; whenever the page becomes
 * visible again the store's value is written back. Passing a stable getter
 * (defined once in the script) keeps the action from re-running per render.
 */

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

interface Tracked {
  el: Field
  read: () => string
}

const tracked = new Set<Tracked>()

/** Write every registered field's store value back into it. Exported for tests. */
export function syncTrackedFields(): void {
  for (const { el, read } of tracked) {
    if (!el.isConnected) continue
    const next = read()
    if (el.value !== next) el.value = next
  }
}

const syncAll = syncTrackedFields

if (typeof document !== 'undefined') {
  window.addEventListener('pageshow', syncAll)
  document.addEventListener('visibilitychange', () => {
    // Fires on hide too; only the way back in matters.
    if (!document.hidden) syncAll()
  })
}

export const trackField: Action<Field, (() => string) | undefined> = (el, read) => {
  // No getter means "nothing to sync" — the field opts out.
  if (!read) return {}
  const entry: Tracked = { el, read }
  tracked.add(entry)
  syncAll()
  return {
    destroy: () => {
      tracked.delete(entry)
    },
  }
}