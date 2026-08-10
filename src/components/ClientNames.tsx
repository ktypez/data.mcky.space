import type { Client } from '@/types'
import { clientTitle, clientNamesJoined, clientShopsJoined } from '@/lib/clientNames'

interface ClientNamesProps {
  client: Pick<Client, 'name' | 'shopName'>
  titleClassName?: string
  subClassName?: string
}

/**
 * Renders a client's name block as separate, non-mixed groups:
 *
 *   {clientTitle}          — first shop name, else first person name
 *   {names joined " / "}   — all person names (minus the title if it's one)
 *   {shops joined " / "}   — all shop names (minus the title if it's one)
 *
 * Each group stays on its own line; person names and shop names are never
 * combined into a single mixed string.
 */
export default function ClientNames({
  client,
  titleClassName = '',
  subClassName = '',
}: ClientNamesProps) {
  const title = clientTitle(client)
  const names = clientNamesJoined(client)
  const shops = clientShopsJoined(client)

  return (
    <>
      <div className={titleClassName}>{title}</div>
      {names && <div className={subClassName}>{names}</div>}
      {shops && <div className={subClassName}>{shops}</div>}
    </>
  )
}
