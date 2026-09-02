import { useEffect } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import DetailA from '../variants/DetailA'
import DetailB from '../variants/DetailB'
import DetailC from '../variants/DetailC'
import DetailD from '../variants/DetailD'
import DetailE from '../variants/DetailE'

const variants = [
  { id:'a', label:'A · Document', desc:'72ch airy · current' },
  { id:'b', label:'B · Gallery', desc:'hero image' },
  { id:'c', label:'C · Dense', desc:'mono table' },
  { id:'d', label:'D · Timeline', desc:'left rail' },
  { id:'e', label:'E · Split', desc:'info + media' },
]

function Overview(){
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Detail — 5 variations</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 opacity-60">เลือกทรงหน้า detail ที่ชอบ — กดดูเต็มๆ แล้วบอกว่าเอาแบบไหน เดี๋ยวสังเคราะห์ให้</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {variants.map(v=>(
          <NavLink key={v.id} to={`/__design_lab/detail/${v.id}`} className="rounded-2xl border border-black/10 bg-white p-5 hover:shadow-md">
            <p className="font-mono text-xs uppercase opacity-50">{v.label}</p>
            <p className="text-sm opacity-60">{v.desc}</p>
            <span className="mt-3 inline-flex rounded-full bg-black px-3 py-1 text-xs text-white">Open →</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function DetailLabApp(){
  useEffect(()=>{ void useClientStore.getState().initialize() },[])
  return (
    <div className="min-h-dvh bg-[#fcfcf9] text-black">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
          <NavLink to="/__design_lab/detail" className="font-mono text-xs font-semibold">DETAIL LAB</NavLink>
          <span className="opacity-20">/</span>
          <nav className="flex gap-1 overflow-auto">
            <NavLink to="/__design_lab/detail" end className={({isActive})=>`rounded-full px-3 py-1 text-xs whitespace-nowrap ${isActive?'bg-black text-white':'hover:bg-black/5'}`}>Overview</NavLink>
            {variants.map(v=> <NavLink key={v.id} to={`/__design_lab/detail/${v.id}`} className={({isActive})=>`rounded-full px-3 py-1 text-xs whitespace-nowrap ${isActive?'bg-black text-white':'hover:bg-black/5'}`}>{v.label.split('·')[0].trim()}</NavLink>)}
          </nav>
          <div className="ml-auto hidden gap-1 md:flex">
            <NavLink to="/v3" className="rounded-full border border-black/10 px-3 py-1 text-xs">V3 →</NavLink>
            <NavLink to="/__design_lab/pages" className="rounded-full border border-black/10 px-3 py-1 text-xs">Pages Lab →</NavLink>
          </div>
        </div>
      </header>
      <Routes>
        <Route path="/__design_lab/detail" element={<Overview/>} />
        <Route path="/__design_lab/detail/a" element={<DetailA/>} />
        <Route path="/__design_lab/detail/b" element={<DetailB/>} />
        <Route path="/__design_lab/detail/c" element={<DetailC/>} />
        <Route path="/__design_lab/detail/d" element={<DetailD/>} />
        <Route path="/__design_lab/detail/e" element={<DetailE/>} />
        <Route path="*" element={<Navigate to="/__design_lab/detail" replace/>} />
      </Routes>
    </div>
  )
}
