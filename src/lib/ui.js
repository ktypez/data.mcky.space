import { writable, get } from 'svelte/store';

// Which surface is showing
export const view = writable('ledger'); // 'ledger' | 'settings' | 'tokens' | 'trash'
export function setView(v) { view.set(v); }

// Selected client (record detail sheet)
export const selected = writable(null);
// Editor target: {} = add new, otherwise a raw client to edit (sheet overlay)
export const editing = writable(null);

/* Back gesture: each open sheet adds one history barrier.
   A browser back pops the barrier → close the sheet → re-add the barrier,
   so the first back never leaves the app. Explicit close consumes the barrier
   so the next back behaves normally. */
let sheetEntry = false;

function pushSheetEntry() {
  if (typeof window === 'undefined' || sheetEntry) return;
  try {
    window.history.pushState({ dataLedgerSheet: true }, '');
    sheetEntry = true;
  } catch { /* history API unavailable */ }
}

/* Explicit close must never navigate. Mark the barrier consumed so the next
   sheet pushes a fresh one and its back gesture stays on this page. */
function dropSheetEntry() { sheetEntry = false; }

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('popstate', () => {
    if (!get(selected) && !get(editing)) { sheetEntry = false; return; }
    selected.set(null);
    editing.set(null);
    pushSheetEntry();
  });
}

export function openRecord(c) { selected.set(c); pushSheetEntry(); }
export function closeRecord() { selected.set(null); dropSheetEntry(); }

export function openEditor(client = null) {
  selected.set(null);          // switch sheets, no history change
  editing.set(client || {});
  pushSheetEntry();
}
export function closeEditor() { editing.set(null); dropSheetEntry(); }
export function swapToRecord(c) {
  editing.set(null);           // save finished: swap sheets, keep one barrier
  selected.set(c);
}

// Command palette (⌘K)
export const cmdOpen = writable(false);
export function openCmd() { cmdOpen.set(true); }
export function closeCmd() { cmdOpen.set(false); }
export function toggleCmd() { cmdOpen.update(o => !o); }
