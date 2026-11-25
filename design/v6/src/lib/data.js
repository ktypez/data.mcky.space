/* =====================================================================
   DATA LAYER
   Mirrors the shape served by the real API at data.mcky.space:
     GET /api/clients/search?q=&filter=&sort=&offset=&limit=
     GET /api/clients/count
   For this design build we ship a faithful mock so the UI is fully
   explorable. Swap `fetchClients` to hit your real backend — the
   ClientShape below is what the components expect.
   ===================================================================== */

// Real R2 photo URLs captured from the live ledger (graceful fallback to
// a monogram when offline / blocked).
const IMG = {
  a: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwsszkb971y5/t/1795410387575-0-ez74af.jpg',
  b: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwsqfkjc9cqy/t/1795406095224-0-367w91.jpg',
  c: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwpvc86a4tdy/t/1795232938752-0-3ktzw5.jpg',
  d: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwoazho7dyox/t/1795138302175-0-vwvjt9.jpg',
  e: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwnb5lmkle18/t/1795078104847-0-pnzwnk.jpg',
  f: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwn5it4c8dys/t/1795068643521-0-s2ke8u.jpg',
  g: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwkhhy2p192p/t/1794907360770-0-dukgcu.jpg',
  h: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwkb92pe8whv/t/1794896869438-0-mxpq1r.jpg',
  i: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwj4ggf2ebcj/t/1794824990538-0-12ksrw.jpg',
  j: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwitl9v82jbd/t/1794806738313-0-26sjtb.jpg',
  k: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwiqy41fy7yn/t/1794802298676-0-ygzvw5.jpg',
  l: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwhajuo7mcwi/t/1794714522031-0-4mbybx.jpg',
  m: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwg8yok20u5b/t/1794651160663-0-tvzk32.jpg',
  n: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwepusu3x1zm/t/1794558624263-0-68ytsi.jpg',
  o: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwdfgz75a3ky/t/1794480692461-0-xu3yl5.jpg',
  p: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mwa3d40mgcgq/t/1794278958386-0-kuvn0e.jpg',
  q: 'https://pub-462db07575b84a13b83ba0f2632f6ec2.r2.dev/clients/mw93escpop60/t/1794218601966-0-huwibu.jpg'
};

function mk(id, name, customer, { payment = null, note = null, photo = null, date, branch = null } = {}) {
  return { id, name, customer, payment, note, photos: photo ? [IMG[photo]] : [], branch, updatedAt: date };
}

// Faithful slice of the live ledger (names, customers, dates as seen).
export const clients = [
  mk('c01', 'ลาบ ก้อย สโมสร', 'ศักดิ์ชาย บุญชาญ', { date: '2026-11-25' }),
  mk('c02', 'ส้มตำมะกอกแซ่บ × ไก่หมุนละมุนลิ้น - 6 หน้าโรงแรมอาวานี', 'ปัทมราช์ บุญพุฒ', { date: '2026-11-24' }),
  mk('c03', 'ปากหม้อพุพาน - กังสดาล', 'ธัญญา ประกิจวินิจพันธ์', { date: '2026-11-24' }),
  mk('c04', 'บ้าน บ้าน', 'เบญจพล ธราพร', { date: '2026-11-23' }),
  mk('c05', 'โรงเรียนนานาชาติเอเชียสิงคโปร์ ( ASIS )', 'ชนิสรา คุณาธิปอภิสิริ', { payment: 'day', photo: 'a', date: '2026-11-23' }),
  mk('c06', 'เกสร', 'เสมา พวงช่อ', { photo: 'b', date: '2026-11-23' }),
  mk('c07', 'ข้าวเหนียวหมูปิ้งป้าสุ', 'สุกัญญา ท้าวนาง', { date: '2026-11-22' }),
  mk('c08', 'WISHDOG - IKEA Khonkaen', 'วรวิทย์ วาทีโกวิท', { photo: 'c', date: '2026-11-21' }),
  mk('c09', 'สำเภาทอง', 'นิติญา วิลาจันทร์', { photo: 'd', date: '2026-11-20' }),
  mk('c10', 'Wood Land', 'รัฐญาภรณ์ แก้วกลาง', { date: '2026-11-19' }),
  mk('c11', 'บ้านไอติม', 'ณัฐพร คชเดช', { photo: 'e', date: '2026-11-19' }),
  mk('c12', 'Charm Kitchen (ชาม) - รื่นรมย์', 'ฉกาจ จุฑาจินดาเขต', { photo: 'f', date: '2026-11-19' }),
  mk('c13', 'สีก้อยฟ้าว', 'สุนทร คลังชำนาญ', { photo: 'g', date: '2026-11-17' }),
  mk('c14', 'อิทธิพัทธ์ กิตติพัฒนนุกูล', 'อิทธิพัทธ์ กิตติพัฒนนุกูล', { date: '2026-11-17' }),
  mk('c15', 'หมูปิ้งสุโขทัย', 'บุญศรี เมฆมากฤทธิ์', { photo: 'h', date: '2026-11-17' }),
  mk('c16', 'ท่านครก๋วยเตี๋ยวเรือรสเด็ด', 'จณิสตา ปัจจังคะตา', { photo: 'i', date: '2026-11-16' }),
  mk('c17', 'ก๋วยเตี๋ยวเรือคนวัง ฯ (พี่แป้งหมูกระทะ)', 'ปภังวรัตถ์ มะโนวรรณ์', { date: '2026-11-16' }),
  mk('c18', 'กาแฟพันธุ์ไทย - ศาลากลางจังหวัดขอนแก่น', 'ปริญญาภร จิดาวรกิจกุล', { photo: 'j', date: '2026-11-16' }),
  mk('c19', 'ชาคริต กิจชำนาญ (ส่งบ้าน)', 'ชาคริต กิจชำนาญ', { note: 'ส่งบ้านก่อน 17:00 โทรแจ้งก่อนถึง', photo: 'k', date: '2026-11-16' }),
  mk('c20', 'KEYFER YOGURT - คีย์เฟอร์ โยเกิร์ต', 'แพรพิลาส ดุจจานุทัศน์', { photo: 'l', date: '2026-11-22' }),
  mk('c21', 'สเต็ก 49 - กังสดาล', 'โสภิดา นิ่มพันธ์', { photo: 'm', date: '2026-11-14' }),
  mk('c22', 'ลาบบัวตอง', 'บัวตอง สีแก้วน้ำใส', { photo: 'n', date: '2026-11-13' }),
  mk('c23', 'คุณนิวหมูกระทะ - สาขา ในเมือง', 'จักริน จันทวารี', { branch: 'ในเมือง', photo: 'o', date: '2026-11-12' }),
  mk('c24', 'บังขายไก่ทอด & เคบับ โรตี', 'Sai mon Samon', { date: '2026-11-12' }),
  mk('c25', 'Kallayanee Tengpongsathon', 'กัลยาณี เต็งพงษ์สถิต', { date: '2026-11-12' }),
  mk('c26', 'คุณนายหมูกรอบ', 'สิรินภา ครูเกษตร', { date: '2026-11-12' }),
  mk('c27', 'ปั่น ปั่น ปั่น - ตลาดโต้รุ่งร่วมจิตร', 'รุจาภา สุวรรณหงษ์', { photo: 'p', date: '2026-11-10' }),
  mk('c28', 'ร่มไม้ by สุนทรี', 'อมร เพีย', { photo: 'q', date: '2026-11-09' }),
  mk('c29', 'อาคารเฉลิมพระบารมี คณะแพทย์ - สาขาวิชาออร์โธปิดิกส์', 'กมลพร พัฒนภิญญ์', { date: '2026-11-09' }),
  mk('c30', 'อามารี คอฟฟี่ วังเวียง / Amaree', 'นิยาดา จันดาลี', { payment: 'card', date: '2026-11-09' }),
  mk('c31', 'พี แอนด์ พี มินิมาร์ท', 'วาสนา เหียเกตุ', { date: '2026-11-06' }),
  mk('c32', 'ขิม สุกี้โบราณ', 'จิตตวุฒิ สมอุ่มจารย์', { date: '2026-11-06' }),
  mk('c33', 'Charm Kitchen (ชาม) - ศรีจันทร์', 'ฉกาจ จุฑาจินดาเขต', { payment: 'day', date: '2026-11-12' }),
  mk('c34', 'ชัชนิดา เหมือนทองจีน', 'ชัชนิดา เหมือนทองจีน', { date: '2026-11-05' }),
  mk('c35', 'คลังนานาธรรม - ศรีจันทร์ หนองใหญ่', 'ภาวิกา ไชยธรรมมา', { date: '2026-11-05' }),
  mk('c36', 'เส้นสาย', 'ณภัทร รวมสุวรรณ', { note: 'สั่งเป็นชุดใหญ่ คุยเรื่องราคาพิเศษ', date: '2026-11-03' }),
  mk('c37', '289Pastabar', 'อนงค์นาฏ เดชวีระพานิชย์', { date: '2026-11-01' }),
  mk('c38', 'ชางหลง - กังสดาล', 'อภิชชา พรมที', { date: '2026-10-31' }),
  mk('c39', 'ข้าวขาหมู เจริญทาวเวอร์', 'ชินวัตร เพชรวิเศษ', { photo: 'h', date: '2026-11-13' }),
  mk('c40', 'สุนันทา หรเสริฐ', 'สุนันทา หรเสริฐ', { date: '2026-10-30' }),
  mk('c41', 'duem.intown - ในเมือง', 'พิมพรัมภา เขียวแจ่ม', { branch: 'ในเมือง', date: '2026-10-28' }),
  mk('c42', 'duem Coffee - หลังมอ', 'พิมพรัมพา เขียวแจ่ม', { payment: 'card', photo: 'm', date: '2026-10-28' }),
  mk('c43', 'ขนมจีนคุณยาย - สาขาในเมือง', 'สุภัชชา วงศ์สินธุ์', { branch: 'ในเมือง', date: '2026-11-08' }),
  mk('c44', 'ร้านตำซั่วเจ๊แดง', 'ดวงใจ รักเรียน', { note: 'เผ็ดน้อยทุกครั้ง', date: '2026-11-07' }),
  mk('c45', 'ไอศกรีมบ้านคุณตา', 'กาญจนา หวังดี', { photo: 'n', date: '2026-11-02' }),
  mk('c46', 'ข้าวซอยลุงเล็ก', 'อนุชา สิงห์โต', { payment: 'day', date: '2026-10-29' }),
  mk('c47', 'ส้มตำครกใหญ่ - กังสดาล', 'รัตนา มากมี', { branch: 'กังสดาล', date: '2026-10-27' }),
  mk('c48', 'เบเกอรี่บ้านตุ๊กตา', 'ปิยะดา ทองสุข', { photo: 'q', date: '2026-10-26' })
];

// derive timestamps for sorting
for (const c of clients) c.updatedTs = new Date(c.updatedAt + 'T12:00:00').getTime();
const MAX_TS = Math.max(...clients.map(c => c.updatedTs));
const RECENT_CUTOFF = MAX_TS - 14 * 24 * 3600 * 1000;

export const PAYMENT = {
  day:  { id: 'day',  label: 'จ่ายในวัน',     short: 'จ่ายวัน',  tone: 'ok' },
  card: { id: 'card', label: 'บัตรเครดิต',    short: 'บัตร',     tone: 'info' }
};

export const FILTERS = [
  { id: 'all',     label: 'ทั้งหมด',    test: () => true },
  { id: 'photo',   label: 'มีรูป',      test: c => c.photos.length > 0 },
  { id: 'nophoto', label: 'ไม่มีรูป',    test: c => c.photos.length === 0 },
  { id: 'note',    label: 'มีโน้ต',     test: c => !!c.note },
  { id: 'recent',  label: 'ล่าสุด',     test: c => c.updatedTs >= RECENT_CUTOFF },
  { id: 'day',     label: 'จ่ายในวัน',  test: c => c.payment === 'day' },
  { id: 'card',    label: 'บัตรเครดิต', test: c => c.payment === 'card' }
];

export const SORTS = [
  { id: 'recent', label: 'ล่าสุด', cmp: (a, b) => b.updatedTs - a.updatedTs },
  { id: 'name',   label: 'ชื่อ',   cmp: (a, b) => a.name.localeCompare(b.name, 'th') }
];

export function counts() {
  const out = {};
  for (const f of FILTERS) out[f.id] = clients.filter(f.test).length;
  return out;
}

export function query({ q = '', filter = 'all', sort = 'recent' } = {}) {
  const f = FILTERS.find(x => x.id === filter) || FILTERS[0];
  let list = clients.filter(f.test);
  const t = q.trim().toLowerCase();
  if (t) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(t) ||
      (c.customer || '').toLowerCase().includes(t) ||
      (c.note || '').toLowerCase().includes(t) ||
      (c.branch || '').toLowerCase().includes(t)
    );
  }
  const s = SORTS.find(x => x.id === sort) || SORTS[0];
  list = list.slice().sort(s.cmp);
  return list;
}

/* ---------------------------------------------------------------
   fetchClients — plug your real backend here.
   The mock above is returned synchronously-shaped for the UI;
   the real call would be:
     const r = await fetch(`/api/clients/search?q=${q}&filter=${filter}&sort=${sort}`);
     return (await r.json()).clients;
   Keep the ClientShape (id, name, customer, payment, note, photos[],
   branch, updatedAt) and nothing else needs to change.
   --------------------------------------------------------------- */
export async function fetchClients(params) {
  // Return mock data (simulate a little latency so loading states show).
  await new Promise(r => setTimeout(r, 180));
  return query(params);
}
