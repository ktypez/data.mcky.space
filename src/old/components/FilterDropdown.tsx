import { useState } from 'react'
import { Funnel, Image, Circle, Clock, Check, CurrencyDollar } from '@phosphor-icons/react'
import { FilterKey } from '@/types/index'
import { PopoverMenu } from '@/old/components/ui/popover-menu'

interface Counts {
  total: number
  withImages: number
  noImages: number
  recent: number
  penpay: number
}

interface Props {
  filter: FilterKey
  counts: Counts
  onFilter: (key: FilterKey) => void
}

const filterItems: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: FilterKey.All, label: 'ทั้งหมด', icon: <Funnel className="w-3.5 h-3.5" /> },
  { key: FilterKey.WithImages, label: 'มีรูปภาพ', icon: <Image className="w-3.5 h-3.5" /> },
  { key: FilterKey.NoImages, label: 'ไม่มีรูป', icon: <Circle className="w-3.5 h-3.5" /> },
  { key: FilterKey.Recent, label: 'สร้างใน 7 วัน', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: FilterKey.Penpay, label: 'จ่ายในวัน', icon: <CurrencyDollar className="w-3.5 h-3.5" /> },
]

export default function FilterDropdown({ filter, counts, onFilter }: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const currentLabel = filterItems.find((f) => f.key === filter)?.label ?? 'ทั้งหมด'

  const trigger = (
    <button
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors shrink-0"
      aria-label="กรองข้อมูล"
      aria-expanded={open}
    >
      <Funnel className="w-3.5 h-3.5" />
      <span>{currentLabel}</span>
      <span className="font-mono text-[12px]">
        {filter === FilterKey.All
          ? counts.total
          : filter === FilterKey.WithImages
            ? counts.withImages
            : filter === FilterKey.NoImages
              ? counts.noImages
              : filter === FilterKey.Penpay
                ? counts.penpay
                : counts.recent}
      </span>
    </button>
  )

  return (
    <PopoverMenu open={open} onOpenChange={setOpen} trigger={trigger}>
      {filterItems.map((item) => {
        const isActive = filter === item.key
        const count =
          item.key === FilterKey.All
            ? counts.total
            : item.key === FilterKey.WithImages
              ? counts.withImages
              : item.key === FilterKey.NoImages
                ? counts.noImages
                : item.key === FilterKey.Penpay
                  ? counts.penpay
                  : counts.recent

        return (
          <button
            key={item.key}
            onClick={() => {
              onFilter(item.key)
              close()
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <span className="shrink-0 text-muted-foreground">{item.icon}</span>
            <span className="text-[15px] font-medium flex-1">{item.label}</span>
            <span className="font-mono text-[13px] text-muted-foreground">{count}</span>
            {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
          </button>
        )
      })}
    </PopoverMenu>
  )
}
