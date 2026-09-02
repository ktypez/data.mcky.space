import { useClientStore } from '@/stores/client-store'
import AppImage from '@/components/AppImage'
import ClientNames from '@/components/ClientNames'
import { mockDetail } from '../mock'

// E · Split — left info, right map/photos sticky
export default function DetailE(){
  const _real = useClientStore((s:any)=> s.clients.find((x:any)=> x.id==='mtdpwvfvsdcu') || s.clients[0])
  const c = (_real as any) || mockDetail
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <p className="font-mono text-[11px] uppercase opacity-40">E · Split — info left, media right</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex gap-4">
            <AppImage src={c.images[0]} alt="" width={72} height={72} className="h-18 w-18 rounded-2xl object-cover border border-black/10"/>
            <div><ClientNames client={c} variant="detail" titleClassName="text-xl font-semibold" subClassName="text-sm opacity-60"/><p className="mt-1 font-mono text-xs opacity-40">{c.id.slice(0,8)} · {c.badge}</p></div>
          </div>
          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
            <p className="font-mono text-xs uppercase opacity-40">Notes</p><p className="mt-2 leading-7 whitespace-pre-wrap">{c.notes}</p>
            <div className="mt-6 border-t border-black/5 pt-4"><p className="font-mono text-xs uppercase opacity-40">Address</p><p className="mt-2 leading-7">{c.address}</p></div>
            <div className="mt-4 flex gap-2"><button className="rounded-full bg-black px-4 py-1.5 text-xs text-white">Copy</button><button className="rounded-full border border-black/10 px-4 py-1.5 text-xs">Edit</button></div>
          </div>
        </div>
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="aspect-[4/3] bg-black/5"><AppImage src={c.images[1]||c.images[0]} alt="" className="h-full w-full object-cover"/></div>
            <div className="grid grid-cols-3 gap-1 p-1">{c.images.slice(1).map((s:string,i:number)=><AppImage key={i} src={s} alt="" className="aspect-square rounded-xl object-cover"/> )}</div>
          </div>
          <div className="h-48 overflow-hidden rounded-2xl border border-black/10 bg-zinc-100 flex items-center justify-center font-mono text-xs opacity-30">Map preview</div>
        </div>
      </div>
    </div>
  )
}
