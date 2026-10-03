import { useClientStore } from '@/stores/client-store'
import AppImage from '@/components/AppImage'
import ClientNames from '@/components/ClientNames'
import { mockDetail } from '../mock'

// D · Timeline — left rail
export default function DetailD(){
  const _real = useClientStore((s:any)=> s.clients.find((x:any)=> x.id==='mtdpwvfvsdcu') || s.clients[0])
  const c = (_real as any) || mockDetail
  const steps = [
    {label:'Created', desc: new Date(c.createdAt).toLocaleString('th-TH')},
    {label:'Updated', desc: new Date(c.updatedAt).toLocaleString('th-TH')},
    {label:'Location', desc: c.address},
    {label:'Photos', desc: `${c.images.length} images`},
  ]
  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <p className="font-mono text-[11px] uppercase opacity-40">D · Timeline — left rail</p>
      <div className="mt-4 flex gap-4">
        <AppImage src={c.images[0]} alt="" width={64} height={64} className="h-16 w-16 rounded-2xl object-cover border border-black/10"/>
        <div><ClientNames client={c} variant="detail" titleClassName="text-lg font-semibold" subClassName="text-sm opacity-60"/></div>
      </div>
      <div className="relative mt-8 border-l border-black/10 pl-6">
        {steps.map((s,i)=><div key={s.label} className="relative mb-6"><span className="absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white">{i+1}</span><p className="font-mono text-xs font-semibold uppercase opacity-60">{s.label}</p><p className="mt-1 text-sm leading-6 opacity-70">{s.desc}</p></div>)}
      </div>
      <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 border border-amber-200">{c.notes}</div>
      <div className="mt-4 grid grid-cols-3 gap-2">{c.images.slice(1).map((s:string,i:number)=><AppImage key={i} src={s} alt="" className="aspect-square rounded-xl object-cover border border-black/5"/> )}</div>
    </div>
  )
}
