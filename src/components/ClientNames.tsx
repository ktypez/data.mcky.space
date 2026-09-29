import type { Client } from '@/types/index'
import { branchValue, clientNameValues, clientShopNames, clientTitleValues } from '@/lib/clientNames'
import OverflowLine from '@/components/OverflowLine'

interface ClientNamesProps {
  client: Pick<Client, 'name' | 'shopName'> & { branch?: string }
  titleClassName?: string
  subClassName?: string
  /** 'detail' only — styles the "สาขา : …" line between title and names. */
  branchClassName?: string
  /** 'list' truncates to fit with "+N"; 'detail' shows all, wrapping only between fields. */
  variant?: 'list' | 'detail'
}

/**
 * Renders a client's name block, keeping the three groups on their own lines:
 *
 *   detail                        list (single compact line)
 *   ──────────────────────        ──────────────────────────
 *   xxx / yyy      (shops)        xxx - อมกร        (shop1 + branch)
 *   สาขา : อมกร                   yyy              (other shops → +1)
 *   ลูกค้า : aaaaa / bbbbb        aaaaa / bbbbb    (person names)
 *
 * In 'detail' the title is the shop names alone — the branch already has its
 * own labelled line right below, so repeating it would show it twice. Every
 * line carries a label, so a block read out of context (or copied) still says
 * what each line is.
 *
 * In 'list' there is no room for labels or a third line, so the branch is
 * glued to the first shop name as "shop - branch" and the remaining shop
 * names follow it — those are what collapse into "+N" when the row is narrow.
 */
export default function ClientNames({
  client,
  titleClassName = '',
  subClassName = '',
  branchClassName = '',
  variant = 'list',
}: ClientNamesProps) {
  const names = clientNameValues(client)

  if (variant === 'detail') {
    // Shop names only: the branch has its own labelled line directly below,
    // so repeating it in the title would show the same value twice.
    const branch = branchValue(client.branch)
    return (
      <>
        <WrapBetweenFields values={clientShopNames(client)} className={titleClassName} />
        <WrapBetweenFields values={branch ? [branch] : []} className={branchClassName} label="สาขา" />
        <WrapBetweenFields values={names} className={subClassName} label="ลูกค้า" />
      </>
    )
  }

  return (
    <>
      <OverflowLine values={clientTitleValues(client)} className={titleClassName} />
      {names.length > 0 && (
        <OverflowLine values={names} className={subClassName} />
      )}
    </>
  )
}

/** Shows every value, wrapping between fields — long single-field names
 *  wrap at word boundaries via overflow-wrap:anywhere (never mid-word).
 *  An optional `label` prefixes the line as "label : " and stays part of the
 *  same text run, so wrapping can also break right after the label. */
function WrapBetweenFields({
  values,
  className = '',
  label,
}: {
  values: string[]
  className?: string
  label?: string
}) {
  if (values.length === 0) return null
  return (
    <div className={className}>
      {label && <span>{label} : </span>}
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
