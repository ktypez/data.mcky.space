# DATA Ledger UI — design/v6

Web UI สำหรับ data.mcky.space (สมุดทะเบียนลูกค้า) — **design & tokens only**
สร้างด้วย Svelte 4 + Vite 5, self-made โดยอ้างอิงสไตล์จาก sakuga-vfx (ไม่ได้ vendor มา)

## รัน

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # ไฟล์ออกที่ dist/
```

## โครงสร้าง

```
src/
  lib/tokens.css     design tokens — 4 พาสเทล (mochi/matcha/soda/sakura) × light/dark
  lib/settings.js    ค่าที่ปรับได้: elevation / ขอบโค้ง / ฟอนต์ / พื้นกระดาษ (persist ที่ localStorage)
  lib/theme.js       palette + theme stores
  lib/data.js        mock dataset (รูปแบบเดียวกับ API จริง — จุดต่อ backend ที่ fetchClients())
  components/        UI primitives (Button, Chip, Slider, ClientRow, CommandPalette, …)
  views/Ledger.svelte   รายการลูกค้าแบบ list
  views/Settings.svelte หน้าตั้งค่า + ตัวอย่างสด + color tokens
```

## ฟอนต์

- ค่าเริ่มต้น: **Itim** (สไตล์ใกล้เคียงโมจิ, Google Fonts)
- ฟอนต์โมจิจริง (Crafty Font · all rights reserved) ใส่เองได้:
  ดาวน์โหลดอย่างถูกต้อง → วางที่ `public/fonts/Moji-Regular.ttf`
  → เปิดแอป → ตั้งค่า → ฟอนต์ → เลือก "โมจิ"

## หมายเหตุ

- ไม่มี gradient — โทนพาสเทลล้วน
- ทุกการยืนยันมี impact burst (การ์ตูน) — ปิดได้ผ่าน prefers-reduced-motion
- ค่าธีม/ตั้งค่าทั้งหมดเก็บใน localStorage (`mochi.theme`, `mochi.settings.v1`)
