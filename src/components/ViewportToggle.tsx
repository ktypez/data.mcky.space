import { Monitor, DeviceMobile } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

/**
 * ViewportToggle — toggle between auto/mobile/desktop viewport modes.
 * In sidebar (desktop): shows as icon button.
 * In header: shows as icon button on md+.
 *
 * auto = respect physical viewport (md breakpoint)
 * mobile = force mobile layout (vd:hidden components show)
 * desktop = force desktop layout (max-vd:hidden components show)
 */
export default function ViewportToggle() {
  const viewportMode = useUIStore((s) => s.viewportMode)
  const setViewportMode = useUIStore((s) => s.setViewportMode)

  const next = () => {
    const cycle: Array<'auto' | 'mobile' | 'desktop'> = ['auto', 'mobile', 'desktop']
    const i = cycle.indexOf(viewportMode)
    setViewportMode(cycle[(i + 1) % cycle.length])
  }

  const labels = { auto: 'อัตโนมัติ', mobile: 'มือถือ', desktop: 'เดสก์ท็อป' }
  const Icon = viewportMode === 'desktop' ? Monitor : DeviceMobile

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`โหมดviewport: ${labels[viewportMode]} — คลิกสลับ`}
      onClick={next}
      title={labels[viewportMode]}
    >
      <Icon className="w-4 h-4 text-primary" />
    </Button>
  )
}
