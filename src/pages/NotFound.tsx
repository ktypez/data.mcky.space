import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 text-center">
      <p className="font-mono text-4xl text-muted-foreground/40">404</p>
      <h1 className="text-lg font-semibold">ไม่พบรายการนี้</h1>
      <button type="button" onClick={() => navigate('/')} className="min-h-11 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted">กลับหน้าหลัก</button>
    </div>
  )
}
