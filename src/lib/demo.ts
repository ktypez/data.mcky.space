// Demo mode — /demo rewrites the URL to / and flags the session so the whole
// V3 app runs on mock data without Clerk, D1, or R2. Refresh keeps the flag;
// "Exit demo" (or closing the tab) clears it.
//
// Mock state lives in this module (plain module-level arrays). Writes mutate
// it — refresh resets everything, which is exactly what a demo should do.

import type { Client, ClientListItem } from '@/types/index'

const DEMO_FLAG = 'ezzylist-demo'

/** True while the app is running in demo mode (this tab, this session). */
export function isDemoMode(): boolean {
  try {
    return sessionStorage.getItem(DEMO_FLAG) === '1'
  } catch {
    return false
  }
}

/** Enter demo mode: flag + rewrite /demo → / so every absolute navigate() works. */
export function enterDemoMode(): void {
  try {
    sessionStorage.setItem(DEMO_FLAG, '1')
  } catch {
    /* ignore */
  }
  if (window.location.pathname.startsWith('/demo')) {
    const rest = window.location.pathname.slice('/demo'.length) || '/'
    window.history.replaceState(null, '', rest || '/')
  }
}

/** Leave demo mode: clear flag + go back to the real catalog. */
export function exitDemoMode(): void {
  try {
    sessionStorage.removeItem(DEMO_FLAG)
  } catch {
    /* ignore */
  }
  window.location.assign('/')
}

// ---------------------------------------------------------------------------
// Mock data — 15 shops around Bangkok, covering every catalog filter:
// with-images (4), no-images (11), recent (edited within 30d), penpay (3),
// credit (3). Two more sit in the trash so restore/force-delete can be shown.
// ---------------------------------------------------------------------------

/** Tiny distinct SVG data-URIs so "with images" shops render offline. */
function svgThumb(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="${color}"/><text x="48" y="56" font-size="34" text-anchor="middle" fill="#fff" font-family="sans-serif">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const DAY = 86_400_000
const now = Date.now()

const seedClients: Client[] = [
  { id: 'demo-01', name: ['สมชาย'], shopName: ['ร้านกาแฟโบราณ'], address: '12 ถ.ดินแดง แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400', lat: 13.7864, lng: 100.5397, images: [svgThumb('ก', '#7c5c3e')], badge: 'penpay', notes: 'ลูกค้าเก่า สั่งประจำทุกเดือน', createdAt: now - 220 * DAY, updatedAt: now - 2 * DAY },
  { id: 'demo-02', name: ['มานะ'], shopName: ['ซ่อมมอเตอร์ไซค์ มานะยนต์'], address: '88/8 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900', lat: 13.8109, lng: 100.6017, images: [], badge: 'credit', notes: 'ค้างชำระรอบสิงหาคม', createdAt: now - 180 * DAY, updatedAt: now - 5 * DAY },
  { id: 'demo-03', name: ['ประภาพรรณ'], shopName: ['ร้านข้าวมันไก่ป้าแดง'], address: '5 ซ.เจริญกรุง 44 เขตบางรัก กรุงเทพฯ 10500', lat: 13.7196, lng: 100.5048, images: [svgThumb('ม', '#b0442f')], badge: null, notes: null, createdAt: now - 160 * DAY, updatedAt: now - 12 * DAY },
  { id: 'demo-04', name: ['วิชัย', 'วิภา'], shopName: ['ห้างค้าปลีกวิชัยพานิช'], address: '999 ถ.สุขุมวิท เขตวัฒนา กรุงเทพฯ 10110', lat: 13.7229, lng: 100.5603, images: [], badge: 'penpay', notes: 'ส่งของทุกวันอังคาร', createdAt: now - 150 * DAY, updatedAt: now - 1 * DAY },
  { id: 'demo-05', name: ['สุนีย์'], shopName: ['ร้านเสื้อผ้าซุปเปอร์สุนีย์'], address: '22 ถ.พระราม 4 เขตปทุมวัน กรุงเทพฯ 10330', lat: 13.7305, lng: 100.5290, images: [], badge: null, notes: 'โปรดประมาณราคาก่อนส่ง', createdAt: now - 140 * DAY, updatedAt: now - 40 * DAY },
  { id: 'demo-06', name: ['อำนาจ'], shopName: ['โรงพิมพ์อำนาจมั่นคง'], address: '1 ถ.พระราม 9 เขตห้วยขวาง กรุงเทพฯ 10320', lat: 13.7531, lng: 100.5672, images: [svgThumb('พ', '#3d5a80')], badge: 'credit', notes: null, createdAt: now - 120 * DAY, updatedAt: now - 7 * DAY },
  { id: 'demo-07', name: ['จิราพร'], shopName: ['ร้านเครื่องเขียนเจ๊จิ'], address: '45/2 ถ.ทองหล่อ เขตคลองเตย กรุงเทพฯ 10110', lat: 13.7313, lng: 100.5810, images: [], badge: null, notes: 'ลูกค้าใหม่ ทดลองสั่ง', createdAt: now - 90 * DAY, updatedAt: now - 3 * DAY },
  { id: 'demo-08', name: ['ธนากร'], shopName: ['ธนากรเฟอร์นิเจอร์'], address: '120 ถ.เจ้าคุณทหาร เขตลาดพร้าว กรุงเทพฯ 10230', lat: 13.8050, lng: 100.5742, images: [], badge: 'penpay', notes: null, createdAt: now - 85 * DAY, updatedAt: now - 15 * DAY },
  { id: 'demo-09', name: ['กนกวรรณ'], shopName: ['สปาสาวสวยกนก'], address: '7 ซ.สุขุมวิท 31 เขตวัฒนา กรุงเทพฯ 10110', lat: 13.7377, lng: 100.5648, images: [], badge: null, notes: 'นัดเวลาก่อนเข้าส่ง 13:00', createdAt: now - 70 * DAY, updatedAt: now - 60 * DAY },
  { id: 'demo-10', name: ['เอกชัย'], shopName: ['ร้านยาเอกชัยฟาร์มาซี'], address: '210 ถ.บางนา-ตราด เขตบางนา กรุงเทพฯ 10260', lat: 13.6960, lng: 100.6310, images: [svgThumb('ย', '#2d6a4f')], badge: 'credit', notes: 'ของบอกเสียห้ามคืน', createdAt: now - 60 * DAY, updatedAt: now - 4 * DAY },
  { id: 'demo-11', name: ['พรทิพย์'], shopName: ['ครัวพรทิพย์ อาหารตามสั่ง'], address: '33 ถ.อ่อนนุช เขตสวนหลวง กรุงเทพฯ 10250', lat: 13.7066, lng: 100.6364, images: [], badge: null, notes: null, createdAt: now - 45 * DAY, updatedAt: now - 9 * DAY },
  { id: 'demo-12', name: ['ณัฐพล'], shopName: ['ร้านมือถือณัฐโมบายล์'], address: '78 ถ.เกษตร-นวมินทร์ เขตบึงกุ่ม กรุงเทพฯ 10240', lat: 13.7790, lng: 100.6620, images: [], badge: null, notes: 'ลูกค้า VIP ส่งด่วนเสมอ', createdAt: now - 30 * DAY, updatedAt: now - 0.4 * DAY },
  { id: 'demo-13', name: ['รัตนา'], shopName: ['ร้านดอกไม้รัตน์นิล'], address: '9 ซ.ร่วมมิตร เขตวังทองหลาง กรุงเทพฯ 10310', lat: 13.7500, lng: 100.6080, images: [], badge: null, notes: null, createdAt: now - 20 * DAY, updatedAt: now - 2 * DAY },
  { id: 'demo-14', name: ['ศิริชัย'], shopName: ['ร้านเกมและอุปกรณ์ศิริโกะ'], address: '501 ถ.รัชดาภิเษก เขตดินแดง กรุงเทพฯ 10400', lat: 13.7795, lng: 100.5470, images: [], badge: null, notes: 'เปิด 14:00-23:00', createdAt: now - 12 * DAY, updatedAt: now - 1.2 * DAY },
  { id: 'demo-15', name: ['อโนชา'], shopName: ['อโนชาเบเกอรี่'], address: '14 ถ.จันทน์ เขตสาทร กรุงเทพฯ 10120', lat: 13.7190, lng: 100.5260, images: [], badge: 'penpay', notes: 'ส่งขนมสดทุกเช้า', createdAt: now - 8 * DAY, updatedAt: now - 0.2 * DAY },
]

export interface DemoTrashItem {
  id: string
  name: string[]
  shopName: string[]
  images: string[]
  badge: string | null
  deletedAt: number
}

const seedTrash: DemoTrashItem[] = [
  { id: 'demo-trash-01', name: ['บุญมี'], shopName: ['ร้านของชำบุญมีมาร์ท'], images: [], badge: null, deletedAt: now - 3 * DAY },
  { id: 'demo-trash-02', name: ['อรทัย'], shopName: ['ร้านอรทัยครีเอทีฟ'], images: [], badge: 'credit', deletedAt: now - 10 * DAY },
]

// --- In-memory mutable state (module-level: survives route changes, resets on reload) ---

let demoClients: Client[] = [...seedClients]
let demoTrash: DemoTrashItem[] = [...seedTrash]

function toListItem(c: Client): ClientListItem {
  return {
    id: c.id,
    name: c.name,
    shopName: c.shopName,
    image: c.images[0] ?? null,
    thumb: c.images[0] ?? null,
    badge: c.badge,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  }
}

// --- Mock API — same contracts as lib/storage.ts ---

export function demoFetchClients(): Client[] {
  return [...demoClients]
}

export function demoFetchClientList(): ClientListItem[] {
  return demoClients.map(toListItem)
}

export function demoFetchClientById(id: string): Client | null {
  return demoClients.find((c) => c.id === id) ?? null
}

export function demoAddClient(client: Client): Client {
  // Strip base64 photos down to keep memory sane — they're already data URIs,
  // nothing to upload, keep the first 4.
  const saved: Client = { ...client, images: client.images.slice(0, 4) }
  demoClients = [saved, ...demoClients]
  return saved
}

export function demoUpdateClient(client: Client): Client {
  const saved: Client = { ...client, images: client.images.slice(0, 4) }
  const idx = demoClients.findIndex((c) => c.id === saved.id)
  if (idx >= 0) demoClients[idx] = saved
  else demoClients = [saved, ...demoClients]
  return saved
}

export function demoDeleteClient(id: string): void {
  const c = demoClients.find((x) => x.id === id)
  if (c) {
    demoTrash = [
      { id: c.id, name: c.name, shopName: c.shopName, images: [], badge: c.badge, deletedAt: Date.now() },
      ...demoTrash,
    ]
    demoClients = demoClients.filter((x) => x.id !== id)
  }
}

export function demoFetchTrash(): DemoTrashItem[] {
  return [...demoTrash]
}

export function demoRestoreClient(id: string): void {
  const t = demoTrash.find((x) => x.id === id)
  if (!t) return
  demoTrash = demoTrash.filter((x) => x.id !== id)
  demoClients = [
    {
      id: t.id,
      name: t.name,
      shopName: t.shopName,
      address: '—',
      lat: null,
      lng: null,
      images: t.images,
      badge: t.badge,
      notes: null,
      createdAt: now - 60 * DAY,
      updatedAt: Date.now(),
    },
    ...demoClients,
  ]
}

export function demoForceDeleteClient(id: string): void {
  demoTrash = demoTrash.filter((x) => x.id !== id)
}
