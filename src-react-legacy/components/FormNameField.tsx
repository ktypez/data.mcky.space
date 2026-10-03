import { Warning } from '@phosphor-icons/react'
import { Label } from '@/components/ui/label'
import MultiValueInput from '@/components/MultiValueInput'
import type { DuplicateResult } from '@/lib/duplicate-names'
import { clientTitle, clientSubNames } from '@/lib/clientNames'

interface FormNameFieldProps {
  values: string[]
  onChange: (values: string[]) => void
  dupResult: DuplicateResult
  autoFocus?: boolean
  inlineAdd?: boolean
}

export default function FormNameField({
  values,
  onChange,
  dupResult,
  autoFocus,
  inlineAdd,
}: FormNameFieldProps) {
  const hasConflict = !!(dupResult.exact || dupResult.similar.length > 0)

  return (
    <div className="space-y-1">
      <Label>ชื่อลูกค้า</Label>
      <MultiValueInput
        values={values}
        onChange={onChange}
        placeholder="ชื่อลูกค้า"
        maxLength={40}
        addLabel="เพิ่มชื่อ"
        variant={hasConflict ? 'error' : 'default'}
        autoFocus={autoFocus}
        inlineAdd={inlineAdd}
      />
      {hasConflict && (
        <div className="flex items-start gap-2 py-2 px-3 rounded-[6px] bg-destructive/10 border border-destructive/40 text-[13px] text-destructive">
          <Warning className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {dupResult.exact && (
              <>
                มีชื่อ &ldquo;{clientTitle(dupResult.exact)}&rdquo; อยู่แล้ว
                {clientSubNames(dupResult.exact) ? ` (${clientSubNames(dupResult.exact)})` : ''}
              </>
            )}
            {!dupResult.exact && dupResult.similar.length > 0 && (
              <>
                ชื่อคล้าย:{' '}
                {dupResult.similar
                  .map(
                    (m) =>
                      `${clientTitle(m.client)}${clientSubNames(m.client) ? ` (${clientSubNames(m.client)})` : ''}`,
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
