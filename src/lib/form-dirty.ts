let dirty = false

export function setFormDirty(value: boolean): void {
  dirty = value
}

export function isFormDirty(): boolean {
  return dirty
}

import { get, writable } from 'svelte/store'

/** Pending navigation waiting on the "leave without saving?" dialog. */
export const leaveRequest = writable<(() => void) | null>(null)

/** Runs `action` now if the form is clean, otherwise asks first. Returns true when it ran. */
export function askLeave(action: () => void): boolean {
  if (!dirty) {
    action()
    return true
  }
  leaveRequest.set(action)
  return false
}

export function confirmLeave(): void {
  const action = get(leaveRequest)
  leaveRequest.set(null)
  dirty = false
  action?.()
}

export function cancelLeave(): void {
  leaveRequest.set(null)
}
