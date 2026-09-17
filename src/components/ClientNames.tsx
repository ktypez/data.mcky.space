import type { Client } from '@/types/index'
import { clientShopNames, clientNameValues } from '@/lib/clientNames'
import OverflowLine from '@/components/OverflowLine'

interface ClientNamesProps {
  client: Pick<Client, 'name' | 'shopName'>
  titleClassName?: string
  subClassName?: string
  /** 'list' truncates to fit with "+N"; 'detail' shows all, wrapping only between fields. */
  variant?: 'list' | 'detail'
}

/**
 * Renders a client's name block with shop names on the title line and
 * person names below, each group never mixed:
 *
 *   {title + all shops}   — "xxx / yyy / zzz" (shops on the title line)
 *   {names joined " / "}  — "aaaaa / bbbbb / cccc" (person names)
 *
 * - variant="list" (default): each line becomes an `OverflowLine` — only the
 *   values that fit the container are shown, hidden ones collapse to "+N".
 * - variant="detail": every value is shown; wrapping only happens at the
 *   " / " separators, never mid-field.
 */
export default function ClientNames({
  client,
  titleClassName = '',
  subClassName = '',
  variant = 'list',
}: ClientNamesProps) {
  const shops = clientShopNames(client)
  const names = clientNameValues(client)

  if (variant === 'detail') {
    return (
      <>
        <WrapBetweenFields values={shops} className={titleClassName} />
        {names.length > 0 && (
          <WrapBetweenFields values={names} className={subClassName} />
        )}
      </>
    )
  }

  return (
    <>
      <OverflowLine values={shops} className={titleClassName} />
      {names.length > 0 && (
        <OverflowLine values={names} className={subClassName} />
      )}
    </>
  )
}

/** Shows every value, wrapping between fields — long single-field names
 *  wrap at word boundaries via overflow-wrap:anywhere (never mid-word). */
function WrapBetweenFields({
  values,
  className = '',
}: {
  values: string[]
  className?: string
}) {
  if (values.length === 0) return null
  return (
    <div className={className}>
      {values.map((v, i) => (
        <span key={i}>
          {i > 0 && ' / '}
          {/* Field allows word-wrap so a single very long shop name or
              person name breaks at word/anywhere boundaries instead of
              overflowing. The outer className owns the text styles;
              these spans only control wrapping behavior. */}
          <span className="whitespace-normal break-words [overflow-wrap:anywhere]">{v}</span>
        </span>
      ))}
    </div>
  )
}
