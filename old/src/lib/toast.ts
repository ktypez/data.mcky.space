import { writable } from 'svelte/store'

export interface Toast {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

export const toasts = writable<Toast[]>([])
let next = 1

export function dismissToast(id: number): void {
  toasts.update((list) => list.filter((t) => t.id !== id))
}

export function showToast(message: string, opts: { actionLabel?: string; onAction?: () => void; ms?: number } = {}): number {
  const id = next++
  toasts.update((list) => [...list.slice(-2), { id, message, actionLabel: opts.actionLabel, onAction: opts.onAction }])
  setTimeout(() => dismissToast(id), opts.ms ?? (opts.onAction ? 6000 : 2800))
  return id
}
