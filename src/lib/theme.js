import { writable, get } from 'svelte/store';

export const PALETTES = [
  { id: 'mochi',   label: 'Mochi',   hue: 256 },
  { id: 'matcha',  label: 'Matcha',  hue: 158 },
  { id: 'soda',    label: 'Soda',    hue: 222 },
  { id: 'sakura',  label: 'Sakura',  hue: 338 }
];
export const MODES = [
  { id: 'light', label: 'Light' },
  { id: 'dark',  label: 'Dark' }
];

const KEY_P = 'mochi.palette';
const KEY_T = 'mochi.theme';

function read() {
  try {
    const p = localStorage.getItem(KEY_P);
    const t = localStorage.getItem(KEY_T);
    return {
      palette: PALETTES.some(x => x.id === p) ? p : 'mochi',
      theme: t === 'dark' ? 'dark' : 'light'
    };
  } catch {
    return { palette: 'mochi', theme: 'light' };
  }
}

const init = read();
export const palette = writable(init.palette);
export const theme = writable(init.theme);

function apply() {
  const el = document.documentElement;
  el.setAttribute('data-palette', get(palette));
  el.setAttribute('data-theme', get(theme));
  try {
    localStorage.setItem(KEY_P, get(palette));
    localStorage.setItem(KEY_T, get(theme));
  } catch { /* ignore */ }
}

palette.subscribe(apply);
theme.subscribe(apply);

export function setPalette(p) { if (PALETTES.some(x => x.id === p)) palette.set(p); }
export function setTheme(t) { theme.set(t === 'dark' ? 'dark' : 'light'); }
export function toggleTheme() { theme.update(t => (t === 'dark' ? 'light' : 'dark')); }
export function cyclePalette() {
  const i = PALETTES.findIndex(x => x.id === get(palette));
  setPalette(PALETTES[(i + 1) % PALETTES.length].id);
}

export function initTheme() { apply(); }
