'use client'

import { Button } from '@/components/ui/button'

interface Props {
  remaining: number
  onClick: () => void
}

export default function LoadMore({ remaining, onClick }: Props) {
  if (remaining <= 0) return null
  return (
    <Button variant="outline" onClick={onClick}>
      โหลดเพิ่ม ({remaining} รายการ)
    </Button>
  )
}
