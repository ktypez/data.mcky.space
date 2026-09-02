import { useClientStore } from '@/stores/client-store'
import AppImage from '@/components/AppImage'
import ClientNames from '@/components/ClientNames'
import { mockDetail } from '../mock'

// A · Document — 72ch airy, divide-y (current v3 is this)
export default function DetailA(){
  const _real = useClientStore((s:any)=> s.clients.find((x:any)=> x.id==='mtdpwvfvsdcu') || s.clients[0])
  const c = (_real as any) || mockDetail
  return (
    <div className="mx-auto max-w-[72ch] px-6 py-8">
      <p className="font-mono text-[11px] uppercase opacity-40">A · Document — current</p>
      <div className="mt-4 flex gap-4">
        <AppImage src={c.images[0]} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover border border-black/10"/>
        <div><ClientNames client={c} variant="detail" titleClassName="text-xl font-semibold" subClassName="text-sm opacity-60"/><p className="mt-1 font-mono text-xs opacity-40">{c.id.slice(0,8)} · {c.badge}</p></div>
      </div>
      <div className="mt-8 divide-y divide-black/5 border-y border-black/5">
        <div className="py-6"><p className="font-mono text-xs uppercase opacity-40">Notes</p><p className="mt-2 leading-7 whitespace-pre-wrap">{c.notes}</p></div>
        <div className="py-6"><p className="font-mono text-xs uppercase opacity-40">Address</p><p className="mt-2 leading-7">{c.address}</p></div>
        <div className="py-6"><p className="font-mono text-xs uppercase opacity-40">Photos · {c.images.length}</p><div className="mt-3 grid grid-cols-3 gap-2">{c.images.map((s:string,i:number)=><AppImage key={i} src={s} alt="" className="aspect-square rounded-xl object-cover border border-black/5"/> )}</div></div>
      </div>
    </div>
  )
}
