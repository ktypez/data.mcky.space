'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSwipe } from '@/hooks/useSwipe'
import type { Client, PendingSuggestion } from '@/types'
import AppImage from '@/components/AppImage'
import MapPreview from '@/components/MapPreviewDynamic'
import AddClientForm from '@/components/AddClientForm'
import SuggestEditForm from '@/components/SuggestEditForm'
import BadgeTag from '@/components/BadgeTag'
import { deleteClient } from '@/lib/storage'
import { copyToClipboard, getMapsUrl, formatDateTime } from '@/lib/utils'
import PhotoRequestDialog from '@/components/PhotoRequestDialog'
import Lightbox from '@/components/Lightbox'
import SuggestionDiff from '@/components/SuggestionDiff'
import {
  Calendar,
  Clock,
  ArrowSquareOut,
  Trash,
  Pencil,
  LinkSimple,
  MapPin,
  Copy,
  X,
  NavigationArrow,
  PencilSimple,
  ChatDots,
   Check,
   CaretDown,
   Camera,
   Spinner,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
 client: Client
 isAdmin: boolean
 clients: Client[]
 onClientUpdated: (client: Client) => void
 onClientDeleted: (id: string) => void
 onSuggestRefresh?: () => void
 hideActions?: boolean
}

export default function ClientDetail({
 client,
 isAdmin,
 clients,
 onClientUpdated,
 onClientDeleted,
 onSuggestRefresh,
 hideActions,
}: Props) {
 const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
 const [photoIdx, setPhotoIdx] = useState(0)
 const [prevClientId, setPrevClientId] = useState(client.id)

 if (client.id !== prevClientId) {
   setPrevClientId(client.id)
   setPhotoIdx(0)
 }

  const imgs = client.images ?? []

 const cardSwipe = useSwipe(
 () => { if (photoIdx < imgs.length - 1) setPhotoIdx(photoIdx + 1) },
 () => { if (photoIdx > 0) setPhotoIdx(photoIdx - 1) },
 )

  const [editOpen, setEditOpen] = useState(false)
 const [deleteConfirm, setDeleteConfirm] = useState(false)
 const [copied, setCopied] = useState<string | null>(null)
 const [showMapConfirm, setShowMapConfirm] = useState(false)
 const [suggestOpen, setSuggestOpen] = useState(false)
 const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([])
 const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())
  const [processingSuggestion, setProcessingSuggestion] = useState<string | null>(null)
  const [suggestError, setSuggestError] = useState('')
  const [photoRequestOpen, setPhotoRequestOpen] = useState(false)
  const [suggestRefresh, setSuggestRefresh] = useState(0)

  const toggleSuggestion = useCallback((id: string) => {
  setExpandedSuggestions((prev) => {
  const next = new Set(prev)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
  })
  }, [])

  const openMapApp = useCallback(() => {
  if (!client.lat || !client.lng) return
  window.location.href = `https://maps.google.com/?q=${client.lat},${client.lng}`
  }, [client.lat, client.lng])

 useEffect(() => {
 const controller = new AbortController()
 fetch(`/api/suggestions?clientId=${client.id}`, { signal: controller.signal })
 .then((r) => r.json())
 .then((data) => {
 if (!Array.isArray(data)) return
 setSuggestions((prev) => {
 const seen = new Set(data.map((s: PendingSuggestion) => s.id))
 const merged = data.map((apiS: PendingSuggestion) => {
 const localS = prev.find((s) => s.id === apiS.id)
 return localS && localS.status !== apiS.status ? localS : apiS
 })
 const extras = prev.filter((s) => !seen.has(s.id))
 return extras.length ? [...merged, ...extras] : merged
 })
 })
  .catch((e) => console.warn('Failed to fetch suggestions', e))
  return () => controller.abort()
 }, [client.id, suggestRefresh])

  const handleCopy = useCallback((mode: 'text' | 'maps' | 'text+maps' = 'text') => {
    const parts: string[] = []
    if (mode !== 'maps') {
      parts.push(`👤 : ${client.name}`)
      if (client.shopName) parts.push(`🛒 : ${client.shopName}`)
      if (client.address) parts.push(`📌 : ${client.address}`)
    }
    let text = parts.join('\n')
    if (mode === 'maps' || mode === 'text+maps') {
      if (!client.lat || !client.lng) return
      const url = getMapsUrl(client.lat, client.lng)
      const mapsText = `🗺️ : ${url}`
      text = mode === 'maps' ? mapsText : text + '\n' + mapsText
    }
    copyToClipboard(text)
    setCopied(mode)
    setTimeout(() => setCopied(null), 1500)
  }, [client])

 const handleDelete = useCallback(() => {
 const deletedClient = client
 onClientDeleted(client.id)
 deleteClient(deletedClient.id).catch(() => {
 onClientUpdated(deletedClient)
 })
 }, [client, onClientDeleted, onClientUpdated])

 const handleEditSave = useCallback(
  (data: Omit<Client, 'createdAt' | 'updatedAt'>) => {
  const updated: Client = { ...client, ...data, updatedAt: Date.now() }
  onClientUpdated(updated)
  setEditOpen(false)
  },
  [client, onClientUpdated],
  )

  const handleApprove = useCallback(
  async (suggestionId: string) => {
  setProcessingSuggestion(suggestionId)
  setSuggestError('')
  try {
  const res = await fetch(`/api/suggestions/${suggestionId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'approve' }),
  })
  if (!res.ok) {
  setSuggestError('อนุมัติไม่สำเร็จ')
  return
  }
  const s = suggestions.find((x) => x.id === suggestionId)
  setSuggestions((prev) =>
  prev.map((s) => (s.id === suggestionId ? { ...s, status: 'approved', updatedAt: Date.now() } : s)),
  )
  setSuggestRefresh((k) => k + 1)
  onSuggestRefresh?.()
  if (s) {
  const updated: Client = {
  ...client,
  name: s.suggested.name,
  shopName: s.suggested.shopName,
  address: s.suggested.address,
  lat: s.suggested.lat,
  lng: s.suggested.lng,
  updatedAt: Date.now(),
  }
  onClientUpdated(updated)
  }
  } catch {
  setSuggestError('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
  } finally {
  setProcessingSuggestion(null)
  }
  },
  [client, onClientUpdated, onSuggestRefresh, suggestions],
  )

  const handleReject = useCallback(
  async (suggestionId: string) => {
  setProcessingSuggestion(suggestionId)
  setSuggestError('')
  try {
  const res = await fetch(`/api/suggestions/${suggestionId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'reject' }),
  })
  if (!res.ok) {
  setSuggestError('ปฏิเสธไม่สำเร็จ')
  return
  }
  setSuggestions((prev) =>
  prev.map((s) => (s.id === suggestionId ? { ...s, status: 'rejected', updatedAt: Date.now() } : s)),
  )
  setSuggestRefresh((k) => k + 1)
  onSuggestRefresh?.()
  } catch {
  setSuggestError('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
  } finally {
  setProcessingSuggestion(null)
  }
  }, [onSuggestRefresh],
  )

  if (editOpen) {
  return (
  <div className="flex-1 min-w-0 flex flex-col">
   <div className="flex-1 overflow-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
   <Card>
    <CardContent className="px-3 py-2">
     <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">
      แก้ไขข้อมูลลูกค้า
     </h2>
    <AddClientForm
     open={editOpen}
     onOpenChange={setEditOpen}
     onSave={handleEditSave}
     editClient={client}
     existingClients={clients}
     variant="inline"
    />
   </CardContent>
  </Card>
 </div>
 </div>
 )
 }

 if (suggestOpen && !isAdmin) {
  return (
  <div className="flex-1 min-w-0 flex flex-col">
   <div className="flex-1 overflow-auto p-4 md:p-6 max-w-4xl mx-auto w-full">
   <Card>
    <CardContent className="px-3 py-2">
     <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">
      แจ้งแก้ไขข้อมูล
     </h2>
     <p className="text-[14px] text-[var(--text-muted)] mb-3">
     คำแนะนำของคุณจะถูกส่งให้ผู้ดูแลตรวจสอบก่อนอัปเดตข้อมูล
    </p>
    <SuggestEditForm
     client={client}
     onClose={() => {
      setSuggestOpen(false)
      setSuggestRefresh((k) => k + 1)
     }}
    />
   </CardContent>
  </Card>
 </div>
 </div>
 )
 }

 return (
 <div className="flex-1 min-w-0 flex flex-col">
 {/* ── BODY ── */}
 <div className="flex-1 overflow-auto p-4 md:p-6 space-y-2 max-w-4xl mx-auto w-full">
 {/* ── CLIENT INFO CARD ── */}
 <Card className="overflow-hidden">
  <CardContent className="px-3 pt-3 pb-2 space-y-2">
   <div>
   <h1 className="text-lg font-bold text-[var(--text-primary)] break-words font-serif">
    {client.shopName || client.name}
   </h1>
   {client.shopName && (
    <p className="text-sm text-[var(--text-secondary)] mt-0.5 ml-0.5">
    {client.name}
    </p>
    )}
   </div>
  {client.address && (
  <div className="flex items-start gap-2">
  <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
  <p className="text-[17px] text-[var(--text-primary)] leading-relaxed">
  {client.address}
  </p>
  </div>
  )}
  <BadgeTag badge={client.badge} size="md" />
   <div className="border-t border-[var(--border)]" />
   <div className="grid grid-cols-3 gap-3">
    <Button
     variant="outline"
     className={`h-10 ${copied === 'text' ? 'border-[var(--success)] text-[var(--success)]' : ''}`}
     onClick={() => handleCopy()}
    >
     <Copy className="w-4 h-4 shrink-0" />
      <span className="text-xs">ข้อความ</span>
    </Button>
    {client.lat != null && client.lng != null && !Number.isNaN(client.lat) && !Number.isNaN(client.lng) && (
     <Button
      variant="outline"
      className={`h-10 ${copied === 'text+maps' ? 'border-[var(--success)] text-[var(--success)]' : ''}`}
      onClick={() => handleCopy('text+maps')}
     >
     <Copy className="w-4 h-4 shrink-0" />
      <span className="text-xs">ข้อความ + แผนที่</span>
     </Button>
    )}
    {client.lat != null && client.lng != null && !Number.isNaN(client.lat) && !Number.isNaN(client.lng) && (
     <Button
      variant="outline"
      className={`h-10 ${copied === 'maps' ? 'border-[var(--success)] text-[var(--success)]' : ''}`}
      onClick={() => handleCopy('maps')}
     >
     <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
     </svg>
      <span className="text-xs">แผนที่</span>
     </Button>
    )}
   </div>
  </CardContent>
 </Card>

 {/* ── NOTES CARD ── */}
 {client.notes && client.notes.trim() && (
  <Card>
   <CardContent className="px-3 py-2 space-y-2">
    <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-[var(--text-muted)] flex items-center gap-1.5">
     <ChatDots className="w-3.5 h-3.5 inline-block" /> บันทึก
    </h2>
    <p className="text-[16px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
     {client.notes}
    </p>
   </CardContent>
  </Card>
 )}

  {/* ── PHOTOS + MAP (side-by-side on desktop) ── */}
 <div className="flex flex-row gap-2">
 {client.images?.length > 0 && (
 <div className="flex-1 flex flex-col gap-0">
 <div
   {...cardSwipe}
   className="aspect-square md:aspect-[2/1] rounded-[10px] overflow-hidden relative touch-pan-y"
  >
 <div
 className={`flex h-full will-change-transform ${cardSwipe.isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
 style={{ transform: `translateX(calc(-${photoIdx * 100}% + ${cardSwipe.dragOffset}px))` }}
 >
 {client.images.map((src, i) => (
 <button
 key={i}
 onClick={() => setLightboxIdx(i)}
 className="min-w-full h-full overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
 >
 <AppImage
 src={src}
 alt={`${client.shopName || client.name} ${i + 1}`}
 className="w-full h-full object-cover"
 />
 </button>
 ))}
 </div>
 {(client.images?.length ?? 0) > 1 && (
 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-auto">
 {client.images.map((_, i) => (
 <button
 key={i}
 onClick={(e) => { e.stopPropagation(); setPhotoIdx(i) }}
 className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
 i === photoIdx
 ? 'bg-[var(--text-primary)] w-5'
 : 'bg-[var(--text-secondary)]/40 hover:bg-[var(--text-secondary)]/60'
 }`}
 aria-label={`Photo ${i + 1}`}
 />
 ))}
 </div>
 )}
 </div>
 </div>
 )}

  {client.lat != null && client.lng != null && !Number.isNaN(client.lat) && !Number.isNaN(client.lng) && (
  <div
    onClick={() => setShowMapConfirm(true)}
    className="flex-1 aspect-square md:aspect-[2/1] rounded-[10px] overflow-hidden relative flex flex-col cursor-pointer"
   >
  <MapPreview lat={client.lat} lng={client.lng} />
 <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium bg-[var(--text-primary)]/80 text-white pointer-events-none">
 <ArrowSquareOut className="w-3 h-3" />
 เปิดแผนที่
 </div>
 </div>
 )}
 </div>

  <Card>
   <CardContent className="px-3 py-2 space-y-2">
    <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-[var(--text-muted)] ">
     <LinkSimple className="w-3.5 h-3.5 inline-block align-text-bottom" /> แชร์แผนที่
    </h2>
   <div className="flex items-center gap-2">
    <input
     readOnly
     value={
      typeof window !== 'undefined' ? `${window.location.origin}/c/${client.id}` : ''
     }
     onClick={(e) => e.currentTarget.select()}
      className="flex-1 h-9 px-3 text-[16px] font-sans rounded-[6px] bg-[var(--surface)] text-[var(--text-secondary)] outline-none select-all cursor-text"
    />
      <Button
       onClick={() => copyToClipboard(`${window.location.origin}/c/${client.id}`)}
       className="whitespace-nowrap text-xs"
      >
       คัดลอก
      </Button>
   </div>
  </CardContent>
 </Card>

  <Card>
   <CardContent className="px-3 py-2 space-y-2">
    <div className="flex items-center justify-between">
     <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-[var(--text-muted)] ">
      <Calendar className="w-3.5 h-3.5 inline-block align-text-bottom" /> วันที่
     </h2>
   </div>
   <div className="flex flex-wrap gap-x-4 gap-y-1">
    <div className="inline-flex items-center gap-1">
     <Calendar className="w-3 h-3 text-[var(--text-muted)] " />
     <span className="text-[14px] text-[var(--text-secondary)] ">
      สร้าง: {formatDateTime(client.createdAt)}
     </span>
    </div>
    {client.updatedAt > client.createdAt && (
     <div className="inline-flex items-center gap-1">
      <Clock className="w-3 h-3 text-[var(--text-muted)] " />
      <span className="text-[14px] text-[var(--text-secondary)] ">
       อัปเดต: {formatDateTime(client.updatedAt)}
      </span>
     </div>
    )}
   </div>
  </CardContent>
 </Card>

  {!hideActions && !isAdmin && (
   <div className="flex gap-2">
    <Button
     variant="outline"
     className="flex-1 h-12 border-[var(--accent-blue)] text-[var(--accent-blue)]"
     onClick={() => setPhotoRequestOpen(true)}
    >
     <Camera className="w-4 h-4" />
     ขอแก้ไขรูป
    </Button>
    <Button
     variant="outline"
     className="flex-1 h-12 border-[var(--accent-blue)] text-[var(--accent-blue)]"
     onClick={() => setSuggestOpen(true)}
    >
     <PencilSimple className="w-4 h-4" />
     แจ้งแก้ไขข้อมูล
    </Button>
   </div>
  )}

 {isAdmin && !hideActions && (
  <div className="flex gap-2">
     <Button
      variant="outline"
      className="flex-1 h-12 border-[var(--accent-blue)] text-[var(--accent-blue)]"
      onClick={() => setEditOpen(true)}
     >
     <Pencil className="w-4 h-4" />
     แก้ไข
    </Button>
    <Button
     variant="destructive"
     className="flex-1 h-12 border-[var(--destructive)]"
     onClick={() => setDeleteConfirm(true)}
    >
     <Trash className="w-4 h-4" />
     ลบ
    </Button>
  </div>
 )}

 {/* ── SUGGESTIONS CARD ── */}
  {suggestions.length > 0 && (
   <Card>
    <CardContent className="px-3 py-2 space-y-2">
     <h2 className="text-[14px] font-medium uppercase tracking-[0.5px] text-[var(--text-muted)] flex items-center gap-1.5">
      <ChatDots className="w-3.5 h-3.5 inline-block" /> คำแนะนำการแก้ไข
     </h2>
     {suggestError && (
       <div className="px-2 py-1.5 rounded-[4px] bg-[var(--destructive)]/10 text-[var(--destructive)] text-[14px]">
         {suggestError}
       </div>
     )}
  <div className="divide-y divide-[var(--border)] -mx-4">
 {[...suggestions]
 .sort((a, b) => b.createdAt - a.createdAt)
 .slice(0, 5)
 .map((s) => (
 <div key={s.id}>
 <button
 onClick={() => toggleSuggestion(s.id)}
 className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--surface)] transition-colors cursor-pointer"
 >
 <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
 {s.status === 'pending' && (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--warning)]/10 rounded-[4px] text-[13px] text-[var(--warning)] font-medium">
 <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
 รอตรวจสอบ
 </span>
 )}
 {s.status === 'approved' && (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--success)]/10 rounded-[4px] text-[13px] text-[var(--success)] font-medium">
 <Check className="w-3 h-3" /> อนุมัติแล้ว
 </span>
 )}
 {s.status === 'rejected' && (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--surface)] rounded-[4px] text-[13px] text-[var(--text-muted)] ">
 <X className="w-3 h-3" /> ปฏิเสธ
 </span>
 )}
 <span className="font-mono text-[14px] text-[var(--text-secondary)] ">
 {formatDateTime(s.createdAt)}
 </span>
 </div>
 <CaretDown
 className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${expandedSuggestions.has(s.id) ? '' : '-rotate-90'}`}
 />
 </button>
 {expandedSuggestions.has(s.id) && (
 <div className="px-4 pb-3 space-y-2">
 <div className="space-y-1">
 <SuggestionDiff
 label="ชื่อ"
 oldVal={s.original.name}
 newVal={s.suggested.name}
 />
 <SuggestionDiff
 label="ร้าน"
 oldVal={s.original.shopName || '-'}
 newVal={s.suggested.shopName || '-'}
 />
 <SuggestionDiff
 label="ที่อยู่"
 oldVal={s.original.address}
 newVal={s.suggested.address}
 />
 {(s.original.lat !== s.suggested.lat ||
 s.original.lng !== s.suggested.lng) && (
 <div className="flex items-center gap-2 text-[15px]">
 <span className="text-[var(--text-muted)] w-12 shrink-0">
 พิกัด
 </span>
 <span className="font-mono text-[13px] text-[var(--text-muted)] line-through">
 {s.original.lat != null
 ? `${s.original.lat.toFixed(4)}, ${s.original.lng?.toFixed(4)}`
 : '-'}
 </span>
 <span className="font-mono text-[13px] text-[var(--success)] font-medium">
 {s.suggested.lat != null
 ? `${s.suggested.lat.toFixed(4)}, ${s.suggested.lng?.toFixed(4)}`
 : '-'}
 </span>
 </div>
 )}
 </div>
  {isAdmin && s.status === 'pending' && (
   <div className="flex gap-1.5 pt-1">
    <Button
     variant="ghost"
     size="sm"
     onClick={() => handleApprove(s.id)}
     disabled={processingSuggestion === s.id}
     className="text-[var(--success)] hover:bg-[var(--success)]/10"
    >
     {processingSuggestion === s.id ? (
      <Spinner className="w-3.5 h-3.5 animate-spin" />
     ) : (
      <Check className="w-3.5 h-3.5" />
     )}{' '}
     อนุมัติ
    </Button>
    <Button
     variant="ghost"
     size="sm"
     onClick={() => handleReject(s.id)}
     disabled={processingSuggestion === s.id}
    >
     {processingSuggestion === s.id ? (
      <Spinner className="w-3.5 h-3.5 animate-spin" />
     ) : (
      <X className="w-3.5 h-3.5" />
     )}{' '}
     ปฏิเสธ
    </Button>
   </div>
  )}
 </div>
 )}
  </div>
  ))}
   </div>
  </CardContent>
 </Card>
 )}
 </div>
 {/* ── DELETE CONFIRM ── */}
  <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm} popupClassName="w-fit min-w-[280px]">
   <DialogContent showCloseButton={false}>
   <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
     <Trash className="w-5 h-5 text-primary" />
    </div>
    <h3 className="text-lg font-bold text-foreground text-center">
     ยืนยันลบข้อมูลลูกค้านี้?
    </h3>
    <p className="text-sm text-muted-foreground text-center">
    {client.shopName || client.name}
   </p>
     <div className="flex gap-2 pt-2">
      <Button
       variant="secondary"
       className="flex-1 h-12"
       onClick={() => setDeleteConfirm(false)}
      >
       ยกเลิก
      </Button>
      <Button
       className="flex-1 h-12"
       onClick={handleDelete}
      >
       ลบ
      </Button>
     </div>
  </DialogContent>
 </Dialog>

 {/* ── MAP CONFIRM ── */}
 <Dialog open={showMapConfirm} onOpenChange={setShowMapConfirm}>
  <DialogContent showCloseButton={false} className="max-w-xs">
   <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
     <NavigationArrow className="w-5 h-5 text-primary" />
    </div>
    <h3 className="text-lg font-bold text-foreground text-center">
     นำทางไปยัง {client.shopName || client.name}?
    </h3>
    <p className="text-sm text-muted-foreground text-center">
    เปิดแผนที่เพื่อนำทาง
   </p>
    <div className="flex gap-2 pt-2">
     <Button
      variant="secondary"
      className="flex-1"
      onClick={() => setShowMapConfirm(false)}
     >
      ยกเลิก
     </Button>
     <Button
      className="flex-1"
      onClick={() => {
       openMapApp()
       setShowMapConfirm(false)
      }}
     >
      เปิดแผนที่
     </Button>
    </div>
  </DialogContent>
 </Dialog>

  {/* ── LIGHTBOX ── */}
  {lightboxIdx != null && imgs.length > 0 && (
    <Lightbox
      images={imgs}
      index={lightboxIdx}
      onClose={() => setLightboxIdx(null)}
      onIndexChange={setLightboxIdx}
    />
  )}

  {/* ── PHOTO REQUEST MODAL ── */}
  <PhotoRequestDialog
    client={client}
    open={photoRequestOpen}
    onOpenChange={setPhotoRequestOpen}
  />
  </div>
  )
}
