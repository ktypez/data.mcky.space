import { ArrowLeft, MapTrifold } from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { OfflineMapControl } from '@/components/OfflineMapControl'

export default function V3OfflineMaps() {
  return (
    <section className="mx-auto max-w-xl px-5 pb-8 pt-6 sm:px-6">
      <NavLink to="/" className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeft size={18} /> กลับหน้าหลัก
      </NavLink>
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MapTrifold size={26} weight="duotone" />
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Offline maps</p>
          <h1 className="text-2xl font-semibold tracking-tight">แผนที่ออฟไลน์</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">ดาวน์โหลดแผนที่ไว้ใช้เมื่อไม่มีสัญญาณอินเทอร์เน็ต</p>
        </div>
      </div>
      <OfflineMapControl />
      <div className="mt-5 rounded-2xl border border-border/70 bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
        แพ็กเกจนี้ครอบคลุมจังหวัดขอนแก่น และไม่กระทบข้อมูลหรือแผนที่ออนไลน์ส่วนอื่นของแอป
      </div>
    </section>
  )
}
