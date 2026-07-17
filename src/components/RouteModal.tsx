
import { NavigationArrow, MapPin, CaretUp, CaretDown } from '@phosphor-icons/react'
import type { Client } from '@/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type RouteItem = { client: Client; dist: number }
type RouteData = { origin: { lat: number; lng: number }; clients: RouteItem[] }

function googleMapsUrl(
  originLat: number,
  originLng: number,
  destinations: { lat: number; lng: number }[],
): string {
  const parts = destinations.map((d) => `${d.lat},${d.lng}`)
  return `https://www.google.com/maps/dir/${originLat},${originLng}/${parts.join('/')}`
}

interface Props {
  routeData: RouteData | null
  routeError: string
  onClose: () => void
  onReorder: (data: RouteData) => void
  showManualOrigin?: boolean
  manualOriginLat?: string
  manualOriginLng?: string
  onManualOriginLatChange?: (v: string) => void
  onManualOriginLngChange?: (v: string) => void
  onManualOriginSubmit?: () => void
}

export default function RouteModal({
  routeData,
  routeError,
  onClose,
  onReorder,
  showManualOrigin,
  manualOriginLat = '',
  manualOriginLng = '',
  onManualOriginLatChange,
  onManualOriginLngChange,
  onManualOriginSubmit,
}: Props) {
  const isOpen = !!(routeData || routeError || showManualOrigin)

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] md:max-h-[75vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3.5 md:py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--selection-bg)] text-[var(--accent-blue)] flex items-center justify-center">
              <NavigationArrow className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="max-md:text-[17px] md:text-base font-bold text-[var(--text-primary)]">
                วางแผนเส้นทาง
              </h3>
              {routeData && (
                <p className="max-md:text-[14px] md:text-[15px] text-[var(--text-muted)]">
                  {routeData.clients.length} จุด &middot; เรียงจากใกล้ไปไกล
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error / Manual Origin */}
        {showManualOrigin && !routeData && (
          <div className="p-6 md:p-8 text-center space-y-4">
            <MapPin className="w-9 h-9 md:w-10 md:h-10 mx-auto mb-1 text-[var(--text-muted)] opacity-60" />
            <p className="max-md:text-[16px] md:text-[17px] font-medium text-[var(--text-primary)]">
              ไม่สามารถเข้าถึงตำแหน่งได้
            </p>
            <p className="text-[14px] text-[var(--text-muted)]">
              กรอกพิกัดตำแหน่งเริ่มต้นด้วยตนเอง
            </p>
            <div className="flex gap-2 max-w-xs mx-auto">
              <input
                type="number"
                step="any"
                placeholder="ละติจูด"
                value={manualOriginLat}
                onChange={(e) => onManualOriginLatChange?.(e.target.value)}
                className="flex-1 h-9 px-3 text-[16px] font-sans rounded-[4px] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
              />
              <input
                type="number"
                step="any"
                placeholder="ลองจิจูด"
                value={manualOriginLng}
                onChange={(e) => onManualOriginLngChange?.(e.target.value)}
                className="flex-1 h-9 px-3 text-[16px] font-sans rounded-[4px] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
              />
            </div>
            {routeError && (
              <p className="text-[14px] text-[var(--destructive)]">{routeError}</p>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" className="h-12 px-6" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button className="h-12 px-6" onClick={onManualOriginSubmit}>
                คำนวณเส้นทาง
              </Button>
            </div>
          </div>
        )}
        {!showManualOrigin && routeError && !routeData && (
          <div className="p-8 md:p-10 text-center">
            <MapPin className="w-9 h-9 md:w-10 md:h-10 mx-auto mb-3 text-[var(--destructive)] opacity-60" />
            <p className="max-md:text-[17px] md:text-base font-medium text-[var(--destructive)]">
              {routeError}
            </p>
            <Button variant="outline" className="mt-3 md:mt-4 h-12 px-6" onClick={onClose}>
              ปิด
            </Button>
          </div>
        )}

        {/* Route list */}
        {routeData && (
          <>
            <div className="flex-1 overflow-y-auto px-4 md:px-5 py-3 md:py-4 space-y-2 md:space-y-3">
              {/* Origin */}
              <div className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 md:py-3 rounded-[6px] md:rounded-[8px] bg-[var(--surface)]">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center max-md:text-[14px] md:text-[15px] font-bold shrink-0">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="max-md:text-[15px] md:text-[16px] font-medium text-[var(--text-primary)]">
                    ตำแหน่งปัจจุบัน
                  </div>
                  <div className="font-mono max-md:text-[13px] md:text-[14px] text-[var(--text-muted)]">
                    {routeData.origin.lat.toFixed(5)}, {routeData.origin.lng.toFixed(5)}
                  </div>
                </div>
              </div>

              {routeData.clients.map((item, i) => (
                <div
                  key={item.client.id}
                  className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-[6px] md:rounded-[8px] hover:bg-[var(--surface)] transition-colors"
                >
                  <div className="flex flex-col gap-1 shrink-0">
                    {i > 0 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          const arr = [...routeData.clients]
                          ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
                          onReorder({ ...routeData, clients: arr })
                        }}
                      >
                        <CaretUp className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {i < routeData.clients.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          const arr = [...routeData.clients]
                          ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
                          onReorder({ ...routeData, clients: arr })
                        }}
                      >
                        <CaretDown className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <div
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center max-md:text-[13px] md:text-[15px] font-bold shrink-0 ${
                      i === 0
                        ? 'bg-[var(--success)] text-[var(--success-foreground)]'
                        : i === routeData.clients.length - 1
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--accent-blue)] text-white'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="max-md:text-[15px] md:text-[16px] font-medium text-[var(--text-primary)] truncate">
                      {item.client.shopName || item.client.name}
                    </div>
                    <div className="font-mono max-md:text-[13px] md:text-[14px] text-[var(--text-muted)] truncate">
                      {item.client.shopName ? item.client.name : item.client.address}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono max-md:text-[14px] md:text-[15px] font-semibold text-[var(--text-primary)]">
                      {item.dist < 1
                        ? `${Math.round(item.dist * 1000)} ม.`
                        : `${item.dist.toFixed(1)} กม.`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 md:px-5 py-3 md:py-4 border-t border-[var(--border)] shrink-0">
              <a
                href={googleMapsUrl(
                  routeData.origin.lat,
                  routeData.origin.lng,
                  routeData.clients.map((c) => ({ lat: c.client.lat!, lng: c.client.lng! })),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full"
              >
                <Button variant="default" className="w-full h-12" size="lg">
                  <MapPin className="w-4 h-4" />
                  เปิดใน Google Maps
                </Button>
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
