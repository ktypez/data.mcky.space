'use client'

import { useState, useCallback, useRef } from 'react'
import { compressImage } from '@/lib/compressImage'
import { Camera, Image as ImageIcon, X, Check, Spinner } from '@phosphor-icons/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'

type Props = {
  client: { id: string; name: string; shopName?: string | null }
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function PhotoRequestDialog({ client, open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    setFile(null)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setNote('')
    setSending(false)
    setSent(false)
    setError('')
  }, [])

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setSent(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!file) return
    setSending(true)
    setError('')
    try {
      const compressed = await compressImage(file, 10)
      const formData = new FormData()
      formData.append('clientId', client.id)
      formData.append('clientName', client.shopName || client.name)
      formData.append('note', note)
      formData.append('image', compressed)

      const res = await apiFetch('/api/photo-request', { method: 'POST', body: formData })
      if (res.ok) {
        setSent(true)
        timerRef.current = setTimeout(() => {
          onOpenChange(false)
          reset()
        }, 1500)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'ส่งไม่สำเร็จ')
        setSending(false)
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setSending(false)
    }
  }, [file, client, note, reset, onOpenChange])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onOpenChange(false)
          reset()
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
          <Camera className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] text-center">
          ขอแก้ไขรูป
        </h3>
        <p className="text-sm text-[var(--text-secondary)] text-center">
          {client.shopName || client.name}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelect}
          className="hidden"
        />

        {!preview ? (
          <Button
            variant="outline"
            className="w-full h-32 border-dashed flex flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-8 h-8" />
            <span className="text-[15px]">แตะเพื่อเลือกรูป</span>
          </Button>
        ) : (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="w-full h-40 object-cover rounded-lg"
            />
            <Button
              variant="default"
              size="icon-xs"
              className="absolute top-2 right-2 rounded-full"
              onClick={() => {
                setFile(null)
                setPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return null
                })
              }}
              aria-label="ลบรูปภาพ"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <input
          type="text"
          placeholder="หมายเหตุ (ถ้ามี)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-10 px-3 rounded-lg text-[16px] font-sans bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)] transition-colors"
        />

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              onOpenChange(false)
              reset()
            }}
          >
            ยกเลิก
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!file || sending}
          >
            {sending ? (
              <>
                <Spinner className="w-4 h-4 animate-spin" /> กำลังส่ง...
              </>
            ) : sent ? (
              <>
                <Check className="w-4 h-4" /> ส่งแล้ว
              </>
            ) : (
              'ส่งคำขอ'
            )}
          </Button>
        </div>
        {error && <p className="text-[15px] text-[var(--destructive)] text-center">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
