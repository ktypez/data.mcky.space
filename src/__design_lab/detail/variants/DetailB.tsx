import { useClientStore } from '@/stores/client-store'
import AppImage from '@/components/AppImage'
import ClientNames from '@/components/ClientNames'
import { mockDetail } from '../mock'

// B · Gallery — hero image 16:9 + bento
export default function DetailB(){
  const _real = useClientStore((s:any)=> s.clients.find((x:any)=> x.id==='mtdpwvfvsdcu') || s.clients[0])
  const c = (_real as any) || mockDetail
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <p className="font-mono text-[11px] uppercase opacity-40">B · Gallery — hero image first</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="aspect-[16/9] overflow-hidden bg-black/5"><AppImage src={c.images[0]} alt="" className="h-full w-full object-cover"/></div>
        <div className="p-6">
          <ClientNames client={c} variant="detail" titleClassName="text-2xl font-semibold" subClassName="text-sm opacity-60"/>
          <div className="mt-4 flex gap-2">
            <button className="rounded-full bg-black px-4 py-1.5 text-xs text-white">Copy</button>
            <button className="rounded-full border border-black/10 px-4 py-1.5 text-xs">Edit</button>
            <button className="rounded-full border border-black/10 px-4 py-1.5 text-xs text-red-600">Delete</button>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">{c.images.slice(1).map((s:string,i:number)=><AppImage key={i} src={s} alt="" className="aspect-square rounded-xl object-cover border border-black/5"/> )}</div>
          <div className="mt-6 border-t border-black/5 pt-6"><p className="font-mono text-xs uppercase opacity-40">Notes</p><p className="mt-2 leading-7 whitespace-pre-wrap">{c.notes}</p></div>
          <div className="mt-6 border-t border-black/5 pt-6"><p className="font-mono text-xs uppercase opacity-40">Address</p><p className="mt-2 leading-7">{c.address}</p></div>
        </div>
      </div>
    </div>
  )
}
