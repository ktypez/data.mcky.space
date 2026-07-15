'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'
import { Upload, X, Camera, Spinner, Check } from '@phosphor-icons/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/compressImage'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompressed: (dataUrl: string) => void
}

export default function PhotoUploadModal({ open, onOpenChange, onCompressed }: Props) {
  const [originalSize, setOriginalSize] = useState(0)
  const [compressedSize, setCompressedSize] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setOriginalSize(0)
    setCompressedSize(0)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setDataUrl(null)
    setCompressing(false)
    setDone(false)
    setError('')
  }, [previewUrl])

  const handleClose = useCallback(() => {
    reset()
    onOpenChange(false)
  }, [reset, onOpenChange])

  const handleFile = useCallback(async (f: File) => {
    if (!f.type.startsWith('image/')) return
    if (f.size > 10 * 1024 * 1024) {
      setError('ไฟล์ใหญ่เกิน 10 MB')
      return
    }
    setError('')
    setOriginalSize(f.size)
    setCompressing(true)
    try {
      const compressed = await compressImage(f)
      const reader = new FileReader()
      const url = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(compressed)
      })
      setCompressedSize(compressed.size)
      setPreviewUrl(URL.createObjectURL(compressed))
      setDataUrl(url)
    } catch {
      const reader = new FileReader()
      const url = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(f)
      })
      setCompressedSize(f.size)
      setPreviewUrl(URL.createObjectURL(f))
      setDataUrl(url)
    } finally {
      setCompressing(false)
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleConfirm = useCallback(() => {
    if (!dataUrl) return
    setDone(true)
    onCompressed(dataUrl)
  }, [dataUrl, onCompressed])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <div className="w-12 h-12 mx-auto rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
          <Camera className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] text-center">เพิ่มรูปร้านค้า</h3>

        {!dataUrl && !compressing ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : 'border-[var(--border)] hover:border-[var(--text-muted)]'
            }`}
          >
            <Upload className="w-8 h-8 text-[var(--text-muted)]" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">ลากมาวาง หรือแตะเพื่อเลือกรูป</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">JPEG, PNG</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
          </div>
        ) : compressing ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner className="w-8 h-8 animate-spin text-[var(--primary)]" />
            <p className="text-sm text-[var(--text-muted)]">กำลังบีบอัดรูป...</p>
          </div>
        ) : done ? (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-[var(--success)]" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">เพิ่มรูปสำเร็จ!</p>
            </div>
            <Button className="w-full" onClick={handleClose}>ตกลง</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
            )}
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">
                  {originalSize !== compressedSize ? (
                    <><span className="line-through">{formatSize(originalSize)}</span> → {formatSize(compressedSize)}</>
                  ) : (
                    formatSize(compressedSize)
                  )}
                </p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={reset}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {error && <p className="text-sm text-[var(--destructive)] text-center">{error}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleClose}>ยกเลิก</Button>
              <Button className="flex-1" onClick={handleConfirm}>เพิ่มรูป</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
