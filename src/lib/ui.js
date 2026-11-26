import { writable, get } from 'svelte/store';

// Which surface is showing
export const view = writable('ledger'); // 'ledger' | 'settings' | 'tokens' | 'trash'
export function setView(v) { view.set(v); }

// Editor target: null = add new, otherwise a raw client to edit (sheet overlay)
export const editing = writable(null);
export function openEditor(client = null) { closeRecord(); editing.set(client || {}); }
export function closeEditor() { editing.set(null); }

// Command palette (⌘K)
export const cmdOpen = writable(false);
export function openCmd() { cmdOpen.set(true); }
export function closeCmd() { cmdOpen.set(false); }
export function toggleCmd() { cmdOpen.update(o => !o); }

// Selected client (record detail sheet)
export const selected = writable(null);
export function openRecord(c) { selected.set(c); }
export function closeRecord() { selected.set(null); }
