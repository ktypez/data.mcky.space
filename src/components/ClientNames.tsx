import type { Client } from '@/types'
import { clientTitleWithShops, clientNamesJoined } from '@/lib/clientNames'

interface ClientNamesProps {
  client: Pick<Client, 'name' | 'shopName'>
  titleClassName?: string
  subClassName?: string
}

/**
 * Renders a client's name block with shop names on the title line and
 * person names below, each group never mixed:
 *
 *   {title + all shops}   — "xxx / yyy / zzz" (shops on the title line)
 *   {names joined " / "}  — "aaaaa / bbbbb / cccc" (person names)
 */
export default function ClientNames({
  client,
  titleClassName = '',
  subClassName = '',
}: ClientNamesProps) {
  const title = clientTitleWithShops(client)
  const names = clientNamesJoined(client)

  return (
    <>
      <div className={titleClassName}>{title}</div>
      {names && <div className={subClassName}>{names}</div>}
    </>
  )
}
