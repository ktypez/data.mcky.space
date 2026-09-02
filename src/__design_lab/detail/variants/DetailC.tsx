import { useClientStore } from '@/stores/client-store'
import { mockDetail } from '../mock'

// C · Dense — mono table
export default function DetailC(){
  const _real = useClientStore((s:any)=> s.clients.find((x:any)=> x.id==='mtdpwvfvsdcu') || s.clients[0])
  const c = (_real as any) || mockDetail
  const rows: [string,string][] = [
    ['ID', c.id.slice(0,8)],
    ['Name', c.name.join(', ')],
    ['Shop', c.shopName.join(', ')],
    ['Badge', c.badge||'—'],
    ['Address', c.address],
    ['Notes', c.notes],
    ['Photos', String(c.images.length)],
    ['Created', new Date(c.createdAt).toLocaleString('th-TH')],
    ['Updated', new Date(c.updatedAt).toLocaleString('th-TH')],
  ]
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <p className="font-mono text-[11px] uppercase opacity-40">C · Dense — mono table</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-white">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {rows.map(([k,v])=>(
              <tr key={k} className="border-b border-black/5 last:border-0">
                <td className="w-28 bg-zinc-50 px-3 py-2 font-semibold uppercase opacity-60">{k}</td>
                <td className="px-3 py-2 leading-5">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="rounded bg-black px-3 py-1.5 font-mono text-xs text-white">Copy</button>
        <button className="rounded border border-black/10 px-3 py-1.5 font-mono text-xs">Edit</button>
        <button className="rounded border border-red-200 bg-red-50 px-3 py-1.5 font-mono text-xs text-red-600">Delete</button>
      </div>
    </div>
  )
}
