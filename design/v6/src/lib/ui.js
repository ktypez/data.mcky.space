import { writable, get } from 'svelte/store';

// Which surface is showing
export const view = writable('ledger'); // 'ledger' | 'settings'
export function setView(v) { view.set(v); }

// Command palette (⌘K)
export const cmdOpen = writable(false);
export function openCmd() { cmdOpen.set(true); }
export function closeCmd() { cmdOpen.set(false); }
export function toggleCmd() { cmdOpen.update(o => !o); }

// Selected client (record detail sheet)
export const selected = writable(null);
export function openRecord(c) { selected.set(c); }
export function closeRecord() { selected.set(null); }
