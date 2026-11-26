import { writable, get } from 'svelte/store';

export const PALETTES = [
  { id: 'mochi',   label: 'Mochi',   hue: 256 },
  { id: 'matcha',  label: 'Matcha',  hue: 158 },
  { id: 'soda',    label: 'Soda',    hue: 222 },
  { id: 'sakura',  label: 'Sakura',  hue: 338 }
];
export const MODES = [
  { id: 'auto',  label: 'อัตโนมัติ' },
  { id: 'light', label: 'สว่าง' },
  { id: 'dark',  label: 'มืด' }
];

const KEY_P = 'mochi.palette';
const KEY_T = 'mochi.theme';

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

function read() {
  try {
    const p = localStorage.getItem(KEY_P);
    const t = localStorage.getItem(KEY_T);
    return {
      palette: PALETTES.some(x => x.id === p) ? p : 'mochi',
      theme: MODES.some(x => x.id === t) ? t : 'auto'
    };
  } catch {
    return { palette: 'mochi', theme: 'auto' };
  }
}

const init = read();
export const palette = writable(init.palette);
export const theme = writable(init.theme);
export const resolvedTheme = writable('light');

function apply() {
  const el = document.documentElement;
  const mode = get(theme);
  const resolved = mode === 'auto' ? (prefersDark() ? 'dark' : 'light') : mode;
  el.setAttribute('data-palette', get(palette));
  el.setAttribute('data-theme', resolved);
  resolvedTheme.set(resolved);
  try {
    localStorage.setItem(KEY_P, get(palette));
    localStorage.setItem(KEY_T, mode);
  } catch { /* ignore */ }
}

palette.subscribe(apply);
theme.subscribe(apply);

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', () => { if (get(theme) === 'auto') apply(); });
}

export function setPalette(p) { if (PALETTES.some(x => x.id === p)) palette.set(p); }
export function setTheme(t) { if (MODES.some(x => x.id === t)) theme.set(t); }
export function toggleTheme() {
  const i = MODES.findIndex(x => x.id === get(theme));
  theme.set(MODES[(i + 1) % MODES.length].id);
}
export function cyclePalette() {
  const i = PALETTES.findIndex(x => x.id === get(palette));
  setPalette(PALETTES[(i + 1) % PALETTES.length].id);
}

export function initTheme() { apply(); }
