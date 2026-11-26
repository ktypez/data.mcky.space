import { writable, get } from 'svelte/store';

// Which surface is showing
export const view = writable('ledger'); // 'ledger' | 'settings' | 'tokens' | 'editor'
export function setView(v) { view.set(v); }

// Editor target: null = add new, otherwise a raw client to edit
export const editing = writable(null);
export function openEditor(client = null) { editing.set(client); view.set('editor'); }
export function closeEditor() { editing.set(null); view.set('ledger'); }

// Command palette (⌘K)
export const cmdOpen = writable(false);
export function openCmd() { cmdOpen.set(true); }
export function closeCmd() { cmdOpen.set(false); }
export function toggleCmd() { cmdOpen.update(o => !o); }

// Selected client (record detail sheet)
export const selected = writable(null);
export function openRecord(c) { selected.set(c); }
export function closeRecord() { selected.set(null); }
