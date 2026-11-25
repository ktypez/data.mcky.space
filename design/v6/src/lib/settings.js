import { writable } from 'svelte/store';

/* Font choices — "โมจิ-สไตล์" (Itim) is the default; the real Moji font
   can be dropped in at public/fonts/Moji-Regular.ttf and picked here. */
export const FONTS = [
  { id: 'itim',   label: 'โมจิ-สไตล์', note: 'น่ารัก ลายมือ',      stack: '"Itim", "Prompt", ui-sans-serif, system-ui, "Noto Sans Thai", sans-serif' },
  { id: 'mali',   label: 'มาลี',       note: 'สดใส แบบเด็ก ๆ',      stack: '"Mali", "Itim", "Prompt", ui-sans-serif, system-ui, "Noto Sans Thai", sans-serif' },
  { id: 'prompt', label: 'ธรรมดา',     note: 'เรียบร้อย อ่านง่าย',  stack: '"Prompt", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif' },
  { id: 'moji',   label: 'โมจิ',       note: 'ใส่ไฟล์เอง · public/fonts', stack: '"Moji", "Itim", "Prompt", ui-sans-serif, system-ui, "Noto Sans Thai", sans-serif' }
];

export const ELEV_STEPS = ['แบน', 'บาง', 'ปกติ', 'นุ่ม', 'ฟู'];

const KEY = 'mochi.settings.v1';
const DEFAULTS = { elev: 2, radius: 50, font: 'itim', texture: true };

export const settings = writable({ ...DEFAULTS });

let started = false;

export function initSettings() {
  if (started) return;
  started = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) settings.set({ ...DEFAULTS, ...JSON.parse(raw) });
  } catch { /* ignore */ }
  settings.subscribe(apply);
}

function apply(s) {
  const el = document.documentElement;
  // elevation: slider 0–4 → CSS factor 0–2 (1 = default look)
  el.style.setProperty('--elev', String(s.elev / 2));
  // radius: slider 0–100 → scale 0.4–1.6 (50 = 1.0)
  el.style.setProperty('--r-scale', (0.4 + (s.radius / 100) * 1.2).toFixed(3));
  const f = FONTS.find((x) => x.id === s.font) || FONTS[0];
  el.style.setProperty('--font-sans', f.stack);
  el.style.setProperty('--font-display', f.stack);
  el.style.setProperty('--font-fun', f.stack);
  el.dataset.texture = s.texture ? 'on' : 'off';
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function update(partial) {
  settings.update((s) => ({ ...s, ...partial }));
}

export function resetSettings() {
  settings.set({ ...DEFAULTS });
}
