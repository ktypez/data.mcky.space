import { Warning } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DuplicateInfo {
  exact: { name: string; shopName?: string } | null
  similar: { client: { name: string; shopName?: string }; score: number }[]
}

interface FormNameFieldProps {
  value: string
  onChange: (value: string) => void
  hasConflict: boolean
  dupResult: DuplicateInfo
  autoFocus?: boolean
}

export default function FormNameField({
  value,
  onChange,
  hasConflict,
  dupResult,
  autoFocus,
}: FormNameFieldProps) {
  return (
    <div className="space-y-1">
      <Label>ชื่อลูกค้า</Label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={40}
        autoFocus={autoFocus}
        variant={hasConflict ? 'error' : 'default'}
      />
      {hasConflict && (
        <div className="flex items-start gap-2 py-2 px-3 rounded-[6px] bg-destructive/10 border border-destructive/40 text-[13px] text-destructive">
          <Warning className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {dupResult.exact && (
              <>
                มีชื่อ &ldquo;{dupResult.exact.name}&rdquo; อยู่แล้ว
                {dupResult.exact.shopName ? ` (${dupResult.exact.shopName})` : ''}
              </>
            )}
            {!dupResult.exact && dupResult.similar.length > 0 && (
              <>
                ชื่อคล้าย:{' '}
                {dupResult.similar
                  .map(
                    (m) =>
                      `${m.client.name}${m.client.shopName ? ` (${m.client.shopName})` : ''}`,
                  )
                  .join(', ')}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
