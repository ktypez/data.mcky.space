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

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function clientClip(c) {
  const pay = c.payment === 'day' ? 'จ่ายในวัน' : c.payment === 'card' ? 'บัตรเครดิต' : 'วางบิล';
  let out = `${c.name}\nลูกค้า: ${c.customer || '-'}`;
  if (c.branch) out += `\nสาขา: ${c.branch}`;
  out += `\nชำระ: ${pay}`;
  if (c.note) out += `\nโน้ต: ${c.note}`;
  out += `\nอัปเดต: ${fmtDateFull(c.updatedAt)}`;
  return out;
}
