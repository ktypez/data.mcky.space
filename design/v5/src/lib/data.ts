import { useSyncExternalStore } from "react";

/* ——— model ——— */
export type PayBadge = "credit" | "penpay" | null;

export interface Geo {
  lat: number;
  lng: number;
}

export interface Client {
  id: string;
  code: string; // short plus-code, e.g. M8V7+9Q
  name: string;
  owner: string;
  badge: PayBadge;
  notes: string;
  address: string;
  photo: string | null;
  geo: Geo | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt: string | null;
  by: string;
}

export type ClientInput = Omit<Client, "id" | "code" | "createdAt" | "updatedAt" | "deletedAt" | "by">;

export const PHOTOS = [
  "/images/shops/noodle.jpg",
  "/images/shops/cafe.jpg",
  "/images/shops/minimart.jpg",
  "/images/shops/salon.jpg",
  "/images/shops/flowers.jpg",
  "/images/shops/garage.jpg",
];

export const BADGE_META: Record<Exclude<PayBadge, null>, { label: string; th: string }> = {
  credit: { label: "Credit card", th: "บัตรเครดิต" },
  penpay: { label: "Pay daily", th: "จ่ายในวัน" },
};

export function badgeColor(badge: PayBadge): string {
  return badge === "credit" ? "#4c6fe7" : badge === "penpay" ? "#e08a0b" : "#17876b";
}

/* ——— deterministic seed (stable demo data every load) ——— */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: Array<[string, string]> = [
  ["ก๋วยเตี๋ยวป้าแดง", "ป้าแดง"], ["คาเฟ่หมีน้อย", "คุณมิ้น"], ["มินิมาร์ทเจ๊หมวย", "เจ๊หมวย"],
  ["Nail House สาขา 2", "พี่โบว์"], ["ดอกไม้สดยายนิด", "ยายนิด"], ["อู่ช่างตั้ม", "ช่างตั้ม"],
  ["บาร์เบอร์วินเทจ 88", "เสี่ยโจ้"], ["ข้าวมันไก่ลุงเปี๊ยก", "ลุงเปี๊ยก"], ["เบเกอรี่ครัวซองค์ทอง", "คุณแพร"],
  ["ซักอบรีดควันขาว", "น้าอ่อน"], ["ร้านหนังสือเล่มโปรด", "อาจารย์เบญ"], ["สมุนไพรบ้านสวน", "ป้าริน"],
  ["ชาไข่มุกจ๊ะเอ๋", "น้องเอ๋"], ["ร้านทองเจ๊งจก", "เจ๊งจก"], ["เภสัชย์ยิ้มแย้ม", "เภสัชปอ"],
  ["โฟนแอนด์แก็ดเจ็ท", "เจมส์"], ["ตลาดเช้าสดใหม่", "ป้าเจิม"], ["ผลไม้ตามฤดู", "ลุงสนธิ"],
  ["เจ๊โอวข้าวต้ม", "เจ๊โอว"], ["พิมพ์การ์ดแฟสต์", "คุณตี๋"], ["ช่างภาพวันดี", "โฟล์ค"],
  ["ร้านน้ำเต้าหู้เช้า", "ยายจันทร์"], ["ปิ่นโตสามชั้น", "แม่กลอย"], ["ทัวร์เดินป่าใต้", "กายเต้ย"],
  ["ครัวเรือนไทย", "แม่หนู"], ["โมเดลแอนด์ทอยส์", "น้องพลู"], ["ร้านแว่นตาใสๆ", "หมอแว่น"],
  ["เย็นตาโฟท่าพระ", "เจ๊หน่อย"], ["สเต็กบ้านๆ รถไฟ", "พี่ดุลย์"], ["ไอศกรีมรมควัน", "คุณเฟิร์น"],
  ["มะม่วงน้ำปลาหวาน", "ป้าหมู"], ["ข้าวเหนียวมะม่วงทอง", "ย่าทอง"], ["ซาลาเปาไอน้ำ", "ลุงเฉิน"],
  ["หมูปิ้งโบราณ", "เจ๊ตุ๊ก"], ["กาแฟโบราณรถเข็น", "ลุงเกษม"], ["น้ำพริกป้าตู่", "ป้าตู่"],
  ["ร้านเบ็ดเตล็ดรวมใจ", "น้าสร้อย"], ["จิวเวลรี่เงินแท้", "คุณหญิงเงิน"], ["สตูดิโอโยคะใจเย็น", "ครูฟาง"],
  ["ฟิตเนสชุมชน 24", "โค้ชเบนซ์"], ["คาราโอเกะเสียงดี", "เสี่ยเล็ก"], ["ร้านเกมยุค 90", "น้องบิ๊ก"],
  ["สะดวกปั่นจักรยาน", "พี่ตูน"], ["แลกเหรียญสะสม", "ลุงหนวด"], ["ช่อเพื่อนรัก", "คุณอีฟ"],
  ["ข้าวคลุกกะปิเจ", "เจ๊อร"], ["ปาท่องโก๋ทานโตะ", "ตาหยี"], ["ยำแซ่บนัว", "น้องนุ่น"],
];

const STREETS = ["สุขุมวิท", "เพชรบุรี", "ลาดพร้าว", "รัชดาภิเษก", "พหลโยธิน", "เจริญกรุง", "สาทร", "อ่อนนุช", "บางนา-ตราด", "รามคำแหง", "งามวงศ์วาน", "พระราม 9"];
const DISTRICTS = ["คลองเตย", "วัฒนา", "ห้วยขวาง", "จตุจักร", "บางกะปิ", "ธนบุรี", "ปทุมวัน", "บางรัก", "ดินแดง", "พระโขนง"];
const NOTES = [
  "ชอบจ่ายช่วงต้นเดือน — โทรเตือนวันที่ 3",
  "ส่งเอกสารเพิ่มแล้ว รออนุมัติ",
  "แวะเก็บยอดวันพุธบ่าย ร้านเปิดช้า",
  "ลูกค้าประจำ 3 ปี ไม่เคยพลาด",
  "ขอเลื่อนรอบเดือนนี้ 1 อาทิตย์",
  "เปลี่ยนเบอร์ใหม่แล้ว ดูในแชท",
  "สาขานี้ปิดปรับปรุงถึงสิ้นเดือน",
  "เก็บเงินปลายทางเท่านั้น ห้ามโอนล่วงหน้า",
  "ชอบคุยเรื่องแมว ทักทายน้องเหมียวก่อนเจรจา",
  "ย้ายร้านไปตรงข้ามเดิม จำเสาะหาง่าย",
];
const PLUS_CH = "23456789CFGHJMPQRVWX";

function seed(): Client[] {
  const rnd = mulberry32(20261104);
  const now = Date.now();
  const list: Client[] = NAMES.map(([name, owner], i) => {
    const day = 86400000;
    const updatedDays = Math.floor(rnd() * 110);
    const createdDays = updatedDays + Math.floor(rnd() * 400) + 30;
    const badgeRoll = rnd();
    const badge: PayBadge = badgeRoll < 0.3 ? "credit" : badgeRoll < 0.72 ? "penpay" : null;
    const hasGeo = rnd() < 0.55;
    const hasPhoto = i % 3 !== 2; // ~2/3 of records
    const hasNotes = rnd() < 0.58;
    const cc = () => PLUS_CH[Math.floor(rnd() * PLUS_CH.length)];
    const code = `${cc()}${cc()}${cc()}${cc()}+${cc()}${cc()}`;
    const id = `c_${(i + 1).toString(36)}${cc().toLowerCase()}${cc().toLowerCase()}${cc().toLowerCase()}`;
    const soi = Math.floor(rnd() * 60) + 1;
    return {
      id,
      code,
      name,
      owner,
      badge,
      notes: hasNotes ? NOTES[Math.floor(rnd() * NOTES.length)] : "",
      address: `${Math.floor(rnd() * 88) + 1}/${Math.floor(rnd() * 9) + 1} ถ.${STREETS[Math.floor(rnd() * STREETS.length)]} ซ.${soi}, ${DISTRICTS[Math.floor(rnd() * DISTRICTS.length)]}, กรุงเทพฯ ${10100 + Math.floor(rnd() * 60)}`,
      photo: hasPhoto ? PHOTOS[i % PHOTOS.length] : null,
      geo: hasGeo ? { lat: 13.62 + rnd() * 0.32, lng: 100.32 + rnd() * 0.5 } : null,
      createdAt: new Date(now - createdDays * day).toISOString(),
      updatedAt: new Date(now - updatedDays * day).toISOString(),
      deletedAt: null,
      by: "ktypez",
    };
  });
  // sprinkle a few into the trash
  for (let t = 0; t < 5; t++) {
    const idx = Math.floor(rnd() * list.length);
    const days = Math.floor(rnd() * 18) + 1;
    list[idx].deletedAt = new Date(now - days * 86400000).toISOString();
  }
  return list;
}

/* ——— store ——— */
const KEY = "ledger-demo-v1";

function load(): Client[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Client[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) return parsed;
    }
  } catch { /* ignore */ }
  return seed();
}

let state: Client[] = load();
const listeners = new Set<() => void>();
function commit(next: Client[]) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function newId() {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function newCode() {
  const cc = () => PLUS_CH[Math.floor(Math.random() * PLUS_CH.length)];
  return `${cc()}${cc()}${cc()}${cc()}+${cc()}${cc()}`;
}

export const ledger = {
  subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; },
  get: () => state,
  add(input: ClientInput): Client {
    const now = new Date().toISOString();
    const rec: Client = { ...input, id: newId(), code: newCode(), createdAt: now, updatedAt: now, deletedAt: null, by: "you" };
    commit([rec, ...state]);
    return rec;
  },
  update(id: string, patch: Partial<ClientInput>) {
    commit(state.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)));
  },
  softDelete(id: string) {
    commit(state.map((c) => (c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c)));
    },
  restore(id: string) {
    commit(state.map((c) => (c.id === id ? { ...c, deletedAt: null, updatedAt: new Date().toISOString() } : c)));
  },
  purge(id: string) {
    commit(state.filter((c) => c.id !== id));
  },
  reset() {
    commit(seed());
  },
  replaceAll(next: Client[]) { commit(next); },
};

export function useClients(): Client[] {
  return useSyncExternalStore(ledger.subscribe, ledger.get, ledger.get);
}

/* ——— helpers ——— */
export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7); if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export type FilterKey = "all" | "credit" | "penpay" | "notes" | "pinned";

export const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credit" },
  { key: "penpay", label: "Pay daily" },
  { key: "notes", label: "Has notes" },
  { key: "pinned", label: "Pinned" },
];

export function matchesQuery(c: Client, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return [c.name, c.owner, c.code, c.address, c.notes]
    .join(" ")
    .toLowerCase()
    .includes(s);
}

export function matchesFilter(c: Client, f: FilterKey): boolean {
  switch (f) {
    case "all": return true;
    case "credit": return c.badge === "credit";
    case "penpay": return c.badge === "penpay";
    case "notes": return c.notes.trim().length > 0;
    case "pinned": return c.geo !== null;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}
