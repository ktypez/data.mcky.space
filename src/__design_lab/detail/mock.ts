export const mockDetail = {
  id: 'mock-detail-001',
  name: ['สมชาย ใจดี'],
  shopName: ['ร้านสมชาย คาเฟ่'],
  address: '123 ถนนสุขุมวิท แขวงคลองเตย กรุงเทพฯ 10110',
  notes: 'ลูกค้าประจำ สั่งลาเต้เย็นทุกเช้า 8:00 - เพิ่มช็อต วันจันทร์ปิด',
  lat: 13.7563,
  lng: 100.5018,
  images: [
    'https://picsum.photos/seed/detail1/800/600',
    'https://picsum.photos/seed/detail2/600/600',
    'https://picsum.photos/seed/detail3/600/600',
    'https://picsum.photos/seed/detail4/600/600',
  ],
  badge: 'penpay',
  createdAt: Date.now() - 86400000*5,
  updatedAt: Date.now() - 3600000*3,
} as any
