import { useState } from 'react'
import { LinkSimple, Check } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/utils'

interface ClientShareCardProps {
  clientId: string
}

export default function ClientShareCard({ clientId }: ClientShareCardProps) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${clientId}` : ''

  const handleCopy = () => {
    copyToClipboard(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardContent className="px-3 py-2 space-y-2">
        <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-muted-foreground">
          <LinkSimple className="w-3.5 h-3.5 inline-block align-text-bottom" /> แชร์แผนที่
        </h2>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 h-9 px-3 text-[16px] font-sans rounded-[6px] bg-card text-muted-foreground outline-none select-all cursor-text"
          />
          <Button onClick={handleCopy} className="whitespace-nowrap text-xs">
            {copied ? (
              <><Check className="w-3.5 h-3.5" /> คัดลอกแล้ว</>
            ) : (
              'คัดลอก'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
