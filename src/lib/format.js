// Small shared helpers for the UI layer.
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

export function fmtDateFull(iso) {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function fmtDateTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${fmtDate(d.toISOString().slice(0, 10))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Copy to clipboard — synchronous execCommand first, async API fallback. */
export function copyText(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return Promise.resolve(true);
  } catch { /* fall through */ }
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  }
  return Promise.resolve(false);
}

// --- clipboard text: same recipe as the old ledger ---
const stripLabel = (v, label) => (v || '').trim().replace(new RegExp(`^${label}[\\s:]*\\s*`), '');
const shopNameValue = (v) => stripLabel(v, 'ร้าน') || (v || '').trim();
const branchValue = (v) => stripLabel(v, 'สาขา');
const mapsUrl = (lat, lng) => `https://maps.google.com/?q=${lat},${lng}`;

/** Name / shop / branch / address / maps — exactly the old copy output. */
export function clientClip(c) {
  const parts = [];
  for (const n of c.names?.length ? c.names : (c.customer ? [c.customer] : [])) parts.push(`👤 : ${n}`);
  for (const s of c.shopNames?.length ? c.shopNames : (c.name ? [c.name] : [])) parts.push(`🏠 : ${shopNameValue(s)}`);
  const branch = branchValue(c.branch);
  if (branch) parts.push(`สาขา : ${branch}`);
  if (c.address) parts.push(`ที่อยู่ : ${c.address}`);
  if (typeof c.lat === 'number' && typeof c.lng === 'number') {
    parts.push(`แผนที่ : ${mapsUrl(c.lat, c.lng)}`);
  }
  return parts.join('\n');
}
