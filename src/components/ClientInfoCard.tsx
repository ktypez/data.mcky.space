import { MapPin, ClipboardText, Check } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { hasValidCoords } from '@/lib/utils'
import BadgeTag from './BadgeTag'
import ClientNames from './ClientNames'
import type { Client } from '@/types'

interface ClientInfoCardProps {
  client: Client
  copied: string | null
  onCopy: (mode?: 'text' | 'maps' | 'text+maps') => void
}

export default function ClientInfoCard({ client, copied, onCopy }: ClientInfoCardProps) {
  const hasCoords = hasValidCoords(client.lat, client.lng)

  const mapSvg = (
    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )

  return (
    <Card className="overflow-hidden">
      <CardContent className="px-3 pt-3 pb-2 space-y-2">
        <div>
          <ClientNames
            client={client}
            variant="detail"
            titleClassName="text-lg font-bold text-foreground break-words font-serif"
            subClassName="text-sm text-muted-foreground mt-0.5 ml-0.5"
          />
        </div>

        {client.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[17px] text-foreground leading-relaxed">{client.address}</p>
          </div>
        )}

        <BadgeTag badge={client.badge} size="md" />

        <div className="border-t border-border" />

        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant="outline"
            className={`h-9 px-1 transition-all duration-150 ${
              copied === 'text'
                ? 'border-success bg-success/10 text-success'
                : ''
            }`}
            onClick={() => onCopy()}
          >
            {copied === 'text' ? (
              <Check weight="bold" className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ClipboardText className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="text-[11px]">{copied === 'text' ? 'คัดลอกแล้ว' : 'ข้อความ'}</span>
          </Button>

          {hasCoords && (
            <Button
              variant="outline"
              className={`h-9 px-1 transition-all duration-150 ${
                copied === 'text+maps'
                  ? 'border-success bg-success/10 text-success'
                  : ''
              }`}
              onClick={() => onCopy('text+maps')}
            >
              {copied === 'text+maps' ? (
                <Check weight="bold" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ClipboardText className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="text-[11px]">{copied === 'text+maps' ? 'คัดลอกแล้ว' : 'ข้อความ+แผนที่'}</span>
            </Button>
          )}

          {hasCoords && (
            <Button
              variant="outline"
              className={`h-9 px-1 transition-all duration-150 ${
                copied === 'maps'
                  ? 'border-success bg-success/10 text-success'
                  : ''
              }`}
              onClick={() => onCopy('maps')}
            >
              {copied === 'maps' ? (
                <Check weight="bold" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                mapSvg
              )}
              <span className="text-[11px]">{copied === 'maps' ? 'คัดลอกแล้ว' : 'แผนที่'}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
