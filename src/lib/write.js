/* =====================================================================
   WRITE LAYER — real Elysia API. Same endpoints and payload shape as the
   previous data.mcky.space editor: POST/PUT /api/clients, base64 photos via
   /api/photo-request, Bearer Clerk session JWT.
   ===================================================================== */
import { API_BASE } from './data.js';
import { getToken } from './auth.js';

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isBase64 = (s) => typeof s === 'string' && s.startsWith('data:image');

async function headers() {
  const h = { 'Content-Type': 'application/json' };
  try {
    const token = await getToken();
    if (token) h.Authorization = `Bearer ${token}`;
  } catch { /* guest writes will be rejected by the API */ }
  return h;
}

async function json(res) {
  let body;
  try { body = await res.json(); } catch { body = null; }
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
}

/** Upload new base64 photos to R2; returns the full merged image list. */
async function uploadPhotos(clientId, base64Images, deletedImages = [], thumbs = {}) {
  const res = await fetch(`${API_BASE}/api/photo-request`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({
      clientId,
      images: base64Images,
      deletedImages,
      thumbs: base64Images.map((u) => thumbs[u] ?? null),
    }),
  });
  const data = await json(res);
  return data.images || [];
}

/**
 * Create or update a client. `client` uses the editor form shape:
 * { id?, name:string[], shopName:string[], branch, address, lat, lng,
 *   images:string[], badge, notes }
 */
export async function saveClient(client) {
  const base64 = client.images.filter(isBase64);
  const clean = client.images.filter((s) => !isBase64(s));
  const id = client.id || generateId();
  const body = {
    id,
    name: client.name,
    shopName: client.shopName,
    branch: client.branch || '',
    address: client.address || '',
    lat: client.lat,
    lng: client.lng,
    images: clean,
    badge: client.badge || null,
    notes: client.notes || null,
  };
  const isEdit = !!client.id;
  const res = await fetch(isEdit ? `${API_BASE}/api/clients/${encodeURIComponent(id)}` : `${API_BASE}/api/clients`, {
    method: isEdit ? 'PUT' : 'POST',
    headers: await headers(),
    body: JSON.stringify(body),
  });
  await json(res);

  let images = clean;
  if (base64.length) {
    // For edits, drop R2 images the user removed from the gallery.
    const deleted = isEdit ? client.originalImages?.filter((u) => !clean.includes(u)) ?? [] : [];
    images = await uploadPhotos(id, base64, deleted, client.thumbs || {});
  }
  return { ...client, id, images };
}

/** Fetch soft-deleted clients still inside the 30-day trash window. */
export async function fetchTrash() {
  const res = await fetch(`${API_BASE}/api/clients/trash`, { headers: await headers() });
  return json(res);
}

/** action: 'restore' | 'force-delete' (same admin-gated endpoint as the old UI). */
export async function trashAction(id, action) {
  const res = await fetch(`${API_BASE}/api/clients/trash?action=${action}`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ id }),
  });
  return json(res);
}

/** Fetch one raw client row for the editor. */
export async function fetchClient(id) {
  const res = await fetch(`${API_BASE}/api/clients/${encodeURIComponent(id)}?raw=true`);
  return json(res);
}
