
import { useState, useCallback, type DragEvent } from 'react'
import { Upload, X, Camera, Spinner, Check } from '@phosphor-icons/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/compressImage'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** True if the file is (or claims to be) a raster image — checked by MIME
 * or extension, because Android pickers sometimes report generic types
 * like application/octet-stream for gallery images. */
function looksLikeImage(f: File): boolean {
  return (
    f.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name)
  )
}

function isHeic(f: File): boolean {
  return (
    f.type === 'image/heic' ||
    f.type === 'image/heif' ||
    /\.heic$/i.test(f.name)
  )
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
    // Don't silently ignore non-images — Android pickers sometimes report a
    // generic MIME (application/octet-stream) for gallery photos, so check
    // the extension too, and surface a real message when it's not an image.
    if (!looksLikeImage(f)) {
      setError('ไฟล์นี้ไม่ใช่รูปภาพ — เลือกไฟล์ JPEG, PNG หรือ WebP')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('ไฟล์ใหญ่เกิน 10 MB')
      return
    }
    setError('')
    setOriginalSize(f.size)
    setCompressing(true)
    try {
      const compressed = await compressImage(f)

      // HEIC/HEIF this browser can't decode (e.g. Android Chrome):
      // compressImage returns the original File unchanged. The raw file
      // can't be displayed or compressed here, so abort with a clear
      // message instead of uploading something the gallery can't render.
      if (isHeic(f) && compressed === f) {
        setOriginalSize(0)
        setError('รูป HEIC (จาก iPhone) ยังเปิดไม่ได้บนอุปกรณ์นี้ — กรุณาแปลงเป็น JPEG/PNG ก่อน')
        return
      }

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
      // M6 fix: if compression fails (e.g. unsupported format like SVG/GIF,
      // or a buggy bitmap decode), we used to silently send the raw file.
      // Now we warn the user so they know the upload may be larger than usual.
      const reader = new FileReader()
      const url = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(f)
      })
      setCompressedSize(f.size)
      setPreviewUrl(URL.createObjectURL(f))
      setDataUrl(url)
      if (f.size > 2 * 1024 * 1024) {
        setError('ไม่สามารถบีบอัดรูปได้ — ส่งไฟล์ต้นฉบับ (อาจใช้ bandwidth เยอะ)')
      }
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
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground text-center">เพิ่มรูปร้านค้า</h3>

        {!dataUrl && !compressing ? (
          <div className="space-y-3">
            {/*
              Native <label> triggers the file input without relying on a
              programmatic .click() on a display:none input — that pattern
              silently fails on Android Chrome. The input is visually hidden
              (sr-only) but stays in the DOM so the label works everywhere.
            */}
            <label
              htmlFor="photo-upload-input"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">ลากมาวาง หรือแตะเพื่อเลือกรูป</p>
                <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG</p>
              </div>
            </label>
            <input
              id="photo-upload-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
            />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>
        ) : compressing ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">กำลังบีบอัดรูป...</p>
          </div>
        ) : done ? (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">เพิ่มรูปสำเร็จ!</p>
            </div>
            <Button className="w-full" onClick={handleClose}>ตกลง</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
            )}
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
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

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

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
