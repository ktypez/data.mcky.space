import { writable } from 'svelte/store';

/* ---------------------------------------------------------------
   Impact bursts — the "sakuga" confirmation punch.
   Components call boom(x, y) and an EffectLayer renders the burst.
   --------------------------------------------------------------- */
export const bursts = writable([]);
let bid = 0;

export function boom(x, y, opts = {}) {
  const b = {
    id: bid++,
    x, y,
    tone: opts.tone || 'pri',
    n: opts.n || 11,
    size: opts.size || 64
  };
  bursts.update(list => [...list, b]);
  setTimeout(() => {
    bursts.update(list => list.filter(z => z.id !== b.id));
  }, 640);
  return b.id;
}

/* Impact burst from a click/tap event (safe after async gaps). */
export function burstAt(e, opts = {}) {
  const el = e?.currentTarget || e?.target;
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  return boom(r.left + r.width / 2, r.top + r.height / 2, opts);
}

export const toasts = writable([]);
let tid = 0;

export function toast(message, opts = {}) {
  const t = {
    id: tid++,
    message,
    tone: opts.tone || 'default',   // default | pri | ok | warn | acc
    icon: opts.icon || null,
    ttl: opts.ttl ?? 2600
  };
  toasts.update(list => [...list, t]);
  if (t.ttl > 0) {
    setTimeout(() => dismissToast(t.id), t.ttl);
  }
  return t.id;
}

export function dismissToast(id) {
  toasts.update(list => list.filter(t => t.id !== id));
}
