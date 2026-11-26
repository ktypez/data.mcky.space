import { writable } from 'svelte/store'

// Minimal zustand-style store: Svelte's writable plus `getState()` so
// non-component code (lib helpers, treaty client) can read synchronously.
export function create<T extends object>(
  initializer: (
    set: (patch: Partial<T> | ((s: T) => Partial<T>)) => void,
    get: () => T,
  ) => T,
) {
  let current: T
  const { subscribe, set, update } = writable<T>(undefined as unknown as T)
  // eslint-disable-next-line no-underscore-dangle
  current = initializer(
    (patch) =>
      update((s) => ({
        ...s,
        ...(typeof patch === 'function' ? patch(s) : patch),
      })),
    () => current,
  )
  set(current)
  subscribe((v) => {
    current = v
  })
  return {
    subscribe,
    set,
    update,
    setState: (patch: Partial<T>) => update((s) => ({ ...s, ...patch })),
    getState: () => current,
  }
}
