<script lang="ts">
  import { Upload, X, Camera, Spinner, Check } from 'phosphor-svelte'
  import AppDialog from '@/components/AppDialog.svelte'
  import Button from '@/components/ui/Button.svelte'
  import { compressImage, makeThumbDataUrl } from '@/lib/compressImage'

  let { open, onOpenChange, onCompressed }: { open: boolean; onOpenChange: (open: boolean) => void; onCompressed: (dataUrl: string, thumbDataUrl: string | null) => void } = $props()

  let originalSize = $state(0)
  let compressedSize = $state(0)
  let previewUrl = $state<string | null>(null)
  let dataUrl = $state<string | null>(null)
  let thumbUrl = $state<string | null>(null)
  let compressing = $state(false)
  let done = $state(false)
  let error = $state('')
  let dragOver = $state(false)

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function looksLikeImage(f: File): boolean {
    return f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name)
  }

  function isHeic(f: File): boolean {
    return f.type === 'image/heic' || f.type === 'image/heif' || /\.heic$/i.test(f.name)
  }

  function reset() {
    originalSize = 0
    compressedSize = 0
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = null
    dataUrl = null
    thumbUrl = null
    compressing = false
    done = false
    error = ''
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  async function handleFile(f: File) {
    if (!looksLikeImage(f)) {
      error = 'ไฟล์นี้ไม่ใช่รูปภาพ — เลือกไฟล์ JPEG, PNG หรือ WebP'
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      error = 'ไฟล์ใหญ่เกิน 10 MB'
      return
    }
    error = ''
    originalSize = f.size
    compressing = true
    try {
      const compressed = await compressImage(f)
      if (isHeic(f) && compressed === f) {
        originalSize = 0
        error = 'รูป HEIC (จาก iPhone) ยังเปิดไม่ได้บนอุปกรณ์นี้ — กรุณาแปลงเป็น JPEG/PNG ก่อน'
        return
      }
      const reader = new FileReader()
      const url = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(compressed)
      })
      compressedSize = compressed.size
      previewUrl = URL.createObjectURL(compressed)
      dataUrl = url
      thumbUrl = await makeThumbDataUrl(compressed)
    } catch {
      const reader = new FileReader()
      const url = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(f)
      })
      compressedSize = f.size
      previewUrl = URL.createObjectURL(f)
      dataUrl = url
      thumbUrl = await makeThumbDataUrl(f)
      if (f.size > 2 * 1024 * 1024) error = 'ไม่สามารถบีบอัดรูปได้ — ส่งไฟล์ต้นฉบับ (อาจใช้ bandwidth เยอะ)'
    } finally {
      compressing = false
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    const f = e.dataTransfer?.files[0]
    if (f) void handleFile(f)
  }

  function handleConfirm() {
    if (!dataUrl) return
    done = true
    onCompressed(dataUrl, thumbUrl)
  }
</script>

<AppDialog {open} onClose={handleClose} title="เพิ่มรูปร้านค้า" showHeader={false} panelClassName="max-w-sm">
  <div class="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center mt-4">
    <Camera class="w-5 h-5 text-primary" />
  </div>
  <h3 class="text-lg font-bold text-foreground text-center mt-3">เพิ่มรูปร้านค้า</h3>
  <div class="p-6">
    {#if !dataUrl && !compressing}
      <div class="space-y-3">
        <label
          for="photo-upload-input"
          ondrop={handleDrop}
          ondragover={(e) => { e.preventDefault(); dragOver = true }}
          ondragleave={() => (dragOver = false)}
          class="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors {dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}"
        >
          <Upload class="w-8 h-8 text-muted-foreground" />
          <div class="text-center">
            <p class="text-sm font-medium text-foreground">ลากมาวาง หรือแตะเพื่อเลือกรูป</p>
            <p class="mt-1 text-xs text-muted-foreground">JPEG, PNG</p>
          </div>
        </label>
        <input
          id="photo-upload-input"
          type="file"
          accept="image/*"
          class="sr-only"
          onchange={(e) => { const f = e.currentTarget.files?.[0]; if (f) void handleFile(f); e.currentTarget.value = '' }}
        />
        {#if error}
          <p class="text-sm text-destructive text-center">{error}</p>
        {/if}
      </div>
    {:else if compressing}
      <div class="flex flex-col items-center gap-3 py-8">
        <Spinner class="w-8 h-8 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground">กำลังบีบอัดรูป…</p>
      </div>
    {:else if done}
      <div class="space-y-3">
        <div class="flex flex-col items-center gap-3 py-4">
          <div class="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <Check class="w-5 h-5 text-success" />
          </div>
          <p class="text-sm text-muted-foreground">เพิ่มรูปสำเร็จ!</p>
        </div>
        <Button type="button" class="w-full" onclick={handleClose}>ตกลง</Button>
      </div>
    {:else}
      <div class="space-y-3">
        {#if previewUrl}
          <img src={previewUrl} alt="ตัวอย่างรูปที่อัปโหลด" class="w-full h-48 object-cover rounded-lg" />
        {/if}
        <div class="flex items-center gap-3 rounded-lg border border-border p-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-muted-foreground">
              {#if originalSize !== compressedSize}
                <span class="line-through">{formatSize(originalSize)}</span> → {formatSize(compressedSize)}
              {:else}
                {formatSize(compressedSize)}
              {/if}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-xs" onclick={reset}>
            <X class="w-3.5 h-3.5" />
          </Button>
        </div>
        {#if error}
          <p class="text-sm text-destructive text-center">{error}</p>
        {/if}
        <div class="flex gap-2">
          <Button type="button" variant="secondary" class="flex-1" onclick={handleClose}>ยกเลิก</Button>
          <Button type="button" class="flex-1" onclick={handleConfirm}>เพิ่มรูป</Button>
        </div>
      </div>
    {/if}
  </div>
</AppDialog>
