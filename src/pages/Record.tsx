import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PencilSimple, Copy, Check, LinkSimple, Trash } from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { deleteClient, fetchClientByIdResult, peekClientById } from '@/lib/storage'
import type { Client } from '@/types/index'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import AppDialog from '@/components/AppDialog'
import MapPreviewDynamic from '@/components/MapPreviewDynamic'
import { copyToClipboard, formatDate, formatDateTime, getMapsUrl, hasValidCoords, COPIED_FLASH_MS } from '@/lib/utils'
import { clientTextWithMaps } from '@/lib/clientText'
import { clientTitle } from '@/lib/clientNames'

type RecordDataState = 'live' | 'cached' | 'preview' | 'offline' | 'error'

export default function RecordPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const [client, setClient] = useState<Client | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dataState, setDataState] = useState<RecordDataState>('live')
  const [err, setErr] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const allTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (tRef.current) clearTimeout(tRef.current)
    if (allTimerRef.current) clearTimeout(allTimerRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadedId(null)
    setClient(null)
    setLoading(true)
    setRefreshing(false)
    setDataState('live')
    setErr(null)
    setLightboxIdx(null)
    setConfirm(false)
    setCopiedLink(false)
    setCopiedAll(false)

    const load = async () => {
      const storeClient = useClientStore.getState().clients.find(c => c.id === id)
      if (storeClient) {
        setClient(storeClient)
        setDataState('preview')
        setLoading(false)
        setLoadedId(id)
        setRefreshing(true)
      }

      let stale: Client | null = null
      try {
        stale = await peekClientById(id)
        if (cancelled) return
        if (stale) {
          setClient(stale)
          setDataState('cached')
          setLoading(false)
          setLoadedId(id)
          setRefreshing(true)
          useClientStore.getState().upsertClient(stale)
        }
      } catch {
        // A cache miss must not prevent the authoritative request below.
      }

      try {
        const result = await fetchClientByIdResult(id)
        if (cancelled) return
        if (result.status === 'found') {
          setClient(result.client)
          setDataState('live')
          setErr(null)
          useClientStore.getState().upsertClient(result.client)
        } else if (result.status === 'offline') {
          const offlineClient = result.client
          if (offlineClient) {
            setClient(offlineClient)
            setDataState('offline')
            setErr('แสดงข้อมูลจากแคช — ยังตรวจสอบกับเซิร์ฟเวอร์ไม่ได้')
            useClientStore.getState().upsertClient(offlineClient)
          } else {
            const fallback = stale ?? storeClient
            setClient(fallback ?? null)
            setDataState('offline')
            setErr('ออฟไลน์ — ข้อมูลบางส่วนอาจยังไม่ครบ')
          }
        } else if (result.status === 'not-found') {
          setClient(null)
          setDataState('error')
          setErr('ไม่พบข้อมูล')
        } else {
          const fallback = stale ?? storeClient
          setClient(fallback ?? null)
          setDataState('error')
          setErr('โหลดข้อมูลไม่สำเร็จ — กำลังแสดงข้อมูลที่มีอยู่')
        }
      } catch {
        if (!cancelled) {
          const fallback = stale ?? storeClient
          setClient(fallback ?? null)
          setDataState('error')
          setErr('โหลดข้อมูลไม่สำเร็จ — กำลังแสดงข้อมูลที่มีอยู่')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
          setLoadedId(id)
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [id])

  const copyLink = async () => {
    const ok = await copyToClipboard(window.location.href)
    if (!ok) return
    setCopiedLink(true)
    if (tRef.current) clearTimeout(tRef.current)
    tRef.current = setTimeout(() => setCopiedLink(false), COPIED_FLASH_MS)
  }

  const copyAll = async () => {
    if (!client) return
    const ok = await copyToClipboard(clientTextWithMaps(client, getMapsUrl))
    if (!ok) return
    setCopiedAll(true)
    if (allTimerRef.current) clearTimeout(allTimerRef.current)
    allTimerRef.current = setTimeout(() => setCopiedAll(false), COPIED_FLASH_MS)
  }

  const coords = client && hasValidCoords(client.lat, client.lng) ? { lat: client.lat as number, lng: client.lng as number } : null
  const canMutate = isAdmin && dataState === 'live' && !refreshing && !loading

  if (loadedId !== id || (loading && !client)) {
    return <Shell><p className="font-mono text-sm text-muted-foreground" role="status">กำลังโหลด…</p></Shell>
  }
  if (!client) {
    return <Shell><div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center"><p className="font-mono text-xs text-destructive">{err ?? 'ไม่พบข้อมูล'}</p><button type="button" onClick={() => navigate('/')} className="mt-6 min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-card">กลับ</button></div></Shell>
  }

  const doDelete = async () => {
    if (!canMutate) return
    setDeleting(true)
    setErr(null)
    try {
      await deleteClient(client.id)
      useClientStore.getState().removeClient(client.id)
      setConfirm(false)
      navigate('/')
    } catch {
      setErr('ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
    }
  }

  const displayName = clientTitle(client) || client.id.slice(0, 8)
  const badgeLabel = client.badge === 'penpay' ? 'จ่ายในวัน' : client.badge === 'credit' ? 'บัตรเครดิต' : null
  const rows: [string, string][] = [
    ['ที่อยู่', client.address || '—'],
    ['สร้างเมื่อ', formatDate(client.createdAt)],
    ['อัปเดต', formatDate(client.updatedAt)],
  ]

  return (
    <Shell>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => navigate('/')} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted"><ArrowLeft className="inline h-3 w-3" aria-hidden /> กลับ</button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void copyLink()} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted" aria-label="คัดลอกลิงก์">{copiedLink ? <><Check weight="bold" className="inline h-3 w-3 text-success" aria-hidden /> คัดลอกแล้ว</> : <><LinkSimple className="inline h-3 w-3" aria-hidden /> ลิงก์</>}</button>
          {isAdmin && <button type="button" disabled={!canMutate} onClick={() => navigate(`/edit/${encodeURIComponent(client.id)}`)} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"><PencilSimple className="inline h-3 w-3" aria-hidden /> แก้ไข</button>}
          {isAdmin && <button type="button" disabled={!canMutate} onClick={() => setConfirm(true)} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"><Trash className="inline h-3 w-3" aria-hidden /> ลบ</button>}
        </div>
      </div>

      {(refreshing || dataState !== 'live') && (
        <p className="mt-4 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">
          {refreshing ? 'กำลังตรวจสอบข้อมูลล่าสุด…' : err ?? 'ข้อมูลนี้อาจไม่ใช่ข้อมูลล่าสุด'}
        </p>
      )}
      {err && dataState === 'live' && <p role="alert" className="mt-4 rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">{err}</p>}

      <div className="mt-8 min-w-0">
        <h1 className="sr-only">รายละเอียดรายการ</h1>
        <div>
          <ClientNames client={client} variant="detail" titleClassName="text-lg font-semibold leading-tight break-words whitespace-normal [overflow-wrap:anywhere]" branchClassName="mt-1 text-sm opacity-60 break-words whitespace-normal [overflow-wrap:anywhere]" subClassName="mt-1 text-sm opacity-60 break-words whitespace-normal [overflow-wrap:anywhere]" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {badgeLabel && <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 font-mono text-xs font-medium text-secondary-foreground ring-1 ring-border">{badgeLabel}</span>}
          <button type="button" onClick={() => void copyAll()} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 font-mono text-xs text-foreground hover:bg-muted"><Copy className="h-3 w-3" aria-hidden /> {copiedAll ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูล'}</button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {rows.map(([key, value]) => (
              <tr key={key} className="border-b border-border last:border-0">
                <th scope="row" className="w-28 bg-muted/50 px-3 py-2 text-left font-semibold uppercase opacity-60">{key}</th>
                <td className="px-3 py-2 leading-5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {client.notes && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <p className="font-mono text-xs uppercase tracking-wide opacity-40">โน้ต</p>
          <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-foreground/20 pl-4 text-[15px] leading-7 [overflow-wrap:anywhere]">“{client.notes}”</blockquote>
        </div>
      )}

      {coords && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <div className="h-56 overflow-hidden"><MapPreviewDynamic lat={coords.lat} lng={coords.lng} /></div>
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="font-mono text-xs opacity-50">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
            <a href={getMapsUrl(coords.lat, coords.lng)} target="_blank" rel="noreferrer" className="min-h-11 py-3 font-mono text-xs underline opacity-70">เปิด Google Maps →</a>
          </div>
        </div>
      )}

      {client.images.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {client.images.length === 1 ? (
            <button type="button" onClick={() => setLightboxIdx(0)} className="group aspect-square block w-full overflow-hidden">
              <AppImage src={client.images[0]} alt="รูปที่ 1" className="h-full w-full object-cover transition-transform group-hover:scale-[1.01]" />
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
              {client.images.map((src, index) => (
                <button key={`${src}-${index}`} type="button" onClick={() => setLightboxIdx(index)} className="group aspect-square overflow-hidden bg-card">
                  <AppImage src={src} alt={`รูปที่ ${index + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 break-all font-mono text-[10px] uppercase opacity-30">record {client.id} · created {formatDateTime(client.createdAt)}</p>

      <AppDialog open={lightboxIdx !== null} onClose={() => setLightboxIdx(null)} title="รูปภาพ" showHeader={false} variant="lightbox">
        {lightboxIdx !== null && client.images[lightboxIdx] && (
          <div className="relative w-fit">
            <img src={client.images[lightboxIdx]} alt={`รูปที่ ${lightboxIdx + 1}`} className="block max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] object-contain" />
            <button type="button" onClick={() => setLightboxIdx(null)} className="absolute right-3 top-3 min-h-11 rounded-full bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">ปิด</button>
          </div>
        )}
      </AppDialog>

      <AppDialog open={confirm} onClose={() => { if (!deleting) setConfirm(false) }} title="ลบรายการ">
        <div className="p-6">
          <p className="mt-2 text-sm text-muted-foreground">“{displayName}” จะเข้าถังขยะ</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(false)} disabled={deleting} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">ยกเลิก</button>
            <button type="button" disabled={deleting} onClick={() => void doDelete()} className="min-h-11 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">{deleting ? 'กำลังลบ…' : 'ลบ'}</button>
          </div>
        </div>
      </AppDialog>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-6 pb-4 pt-6">{children}</div>
}
