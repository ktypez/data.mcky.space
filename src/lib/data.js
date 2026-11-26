/* =====================================================================
   DATA LAYER — live D1 data via the real Elysia API worker.
   GET /api/clients?limit=all   → every client row
   GET /api/clients/count       → total count
   Raw rows (name/shopName arrays, ms timestamps) are shaped into the
   prototype ClientShape so UI components need no backend knowledge.
   ===================================================================== */
import { writable, get } from 'svelte/store';

// Dev goes through the Vite proxy (the API only allows data.mcky.space);
// production talks to the worker directly.
export const API_BASE = import.meta.env.DEV ? '/api' : 'https://data-api.fall3n.workers.dev';

export const clients = writable([]);
export const loading = writable(true);
export const errorMsg = writable(null);
export const total = writable(0);

let recentCutoff = 0;
let loaded = false;

const asArray = (v) => Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
const first = (v) => asArray(v).find((x) => typeof x === 'string' && x.trim()) || '';

export function normalize(row) {
  const ts = Number(row?.updatedAt) || 0;
  const images = Array.isArray(row?.images) ? row.images.filter((x) => typeof x === 'string' && x) : [];
  return {
    id: String(row?.id ?? ''),
    name: first(row?.shopName) || first(row?.name) || '(ไม่มีชื่อ)',
    customer: first(row?.name),
    names: asArray(row?.name).filter((x) => typeof x === 'string' && x.trim()),
    shopNames: asArray(row?.shopName).filter((x) => typeof x === 'string' && x.trim()),
    payment: row?.badge === 'penpay' ? 'day' : row?.badge === 'credit' ? 'card' : null,
    note: typeof row?.notes === 'string' && row.notes.trim() ? row.notes : '',
    photos: images,
    branch: typeof row?.branch === 'string' ? row.branch : '',
    address: typeof row?.address === 'string' ? row.address : '',
    lat: typeof row?.lat === 'number' ? row.lat : null,
    lng: typeof row?.lng === 'number' ? row.lng : null,
    createdAt: Number(row?.createdAt) || 0,
    updatedAt: ts ? new Date(ts).toISOString().slice(0, 10) : '',
    updatedTs: ts,
  };
}

export async function loadClients(force = false) {
  if (loaded && !force) return;
  loaded = true;
  loading.set(true);
  errorMsg.set(null);
  try {
    const r = await fetch(`${API_BASE}/api/clients?limit=all`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = await r.json();
    const list = (Array.isArray(rows) ? rows : []).map(normalize);
    const maxTs = list.reduce((m, c) => Math.max(m, c.updatedTs), 0);
    recentCutoff = maxTs - 14 * 24 * 3600 * 1000;
    clients.set(list);
    try {
      const cr = await fetch(`${API_BASE}/api/clients/count`);
      if (cr.ok) {
        const j = await cr.json();
        total.set(Number(j?.count) || list.length);
      } else total.set(list.length);
    } catch { total.set(list.length); }
  } catch (e) {
    errorMsg.set(String(e?.message || e));
    clients.set([]);
  } finally {
    loading.set(false);
  }
}

export const PAYMENT = {
  day:  { id: 'day',  label: 'วางบิล',       short: 'วางบิล',  tone: 'ok' },
  card: { id: 'card', label: 'บัตรเครดิต',    short: 'บัตร',     tone: 'info' }
};

export const FILTERS = [
  { id: 'all',     label: 'ทั้งหมด',    test: () => true },
  { id: 'photo',   label: 'มีรูป',      test: c => c.photos.length > 0 },
  { id: 'nophoto', label: 'ไม่มีรูป',    test: c => c.photos.length === 0 },
  { id: 'note',    label: 'มีโน้ต',     test: c => !!c.note },
  { id: 'recent',  label: 'ล่าสุด',     test: c => c.updatedTs >= recentCutoff },
  { id: 'day',     label: 'วางบิล',     test: c => c.payment === 'day' },
  { id: 'card',    label: 'บัตรเครดิต', test: c => c.payment === 'card' }
];

export const SORTS = [
  { id: 'recent', label: 'ล่าสุด', cmp: (a, b) => b.updatedTs - a.updatedTs },
  { id: 'name',   label: 'ชื่อ',   cmp: (a, b) => a.name.localeCompare(b.name, 'th') }
];

export function counts(list = get(clients)) {
  const out = {};
  for (const f of FILTERS) out[f.id] = list.filter(f.test).length;
  return out;
}

/* Search: customer name + shop name (all aliases), plus note/branch.
   Keywords are split on spaces and "+" — every token must match somewhere.
   e.g. "ข้าว + ไก่" matches "ข้าวมันไก่". */
function searchableText(c) {
  const parts = [c.names, c.shopNames, c.name, c.customer, c.note, c.branch];
  return parts
    .flatMap((p) => Array.isArray(p) ? p : [p])
    .filter((v) => typeof v === 'string' && v.trim())
    .join(' ')
    .toLowerCase();
}

export function query({ q = '', filter = 'all', sort = 'recent' } = {}, list = get(clients)) {
  const f = FILTERS.find(x => x.id === filter) || FILTERS[0];
  let result = list.filter(f.test);
  const tokens = q.trim().toLowerCase().split(/[\s+]+/).filter(Boolean);
  if (tokens.length) {
    result = result.filter(c => {
      const text = searchableText(c);
      return tokens.every(t => text.includes(t));
    });
  }
  const s = SORTS.find(x => x.id === sort) || SORTS[0];
  return result.slice().sort(s.cmp);
}

export async function fetchClients(params) {
  await loadClients();
  return query(params);
}
