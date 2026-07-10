'use client'

import { useState, useCallback } from 'react'
import { LockKey } from '@phosphor-icons/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function LoginModal({ open, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = useCallback(async () => {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError('รหัสผ่านไม่ถูกต้อง')
        return
      }
      const data = await res.json()
      if (data.ok) {
        if (data.token) localStorage.setItem('ezzylist_admin_token', data.token)
        onSuccess()
        setPassword('')
        onClose()
      } else {
        setError('รหัสผ่านไม่ถูกต้อง')
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }, [password, onSuccess, onClose])

  const handleClose = useCallback(() => {
    setPassword('')
    setError('')
    onClose()
  }, [onClose])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()} popupClassName="w-fit min-w-[280px]">
      <DialogContent showCloseButton={false} className="space-y-3">
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <div className="size-9 rounded-full bg-destructive/15 flex items-center justify-center">
            <LockKey className="w-4 h-4 text-destructive" />
          </div>
          <h3 className="text-sm font-bold text-foreground">เข้าระบบ</h3>
          <p className="text-xs text-muted-foreground">กรอกรหัสผ่านเพื่อจัดการข้อมูล</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่าน"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && !loading && password && handleLogin()}
          className="w-full h-9 px-3 text-[13px] font-sans rounded-lg bg-muted text-foreground outline-none focus:border-ring placeholder:text-muted-foreground"
        />
        {error && (
          <p className="text-xs text-destructive font-semibold text-center -mt-1">{error}</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-9 text-xs" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-9 text-xs"
            onClick={handleLogin}
            disabled={loading || !password}
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าระบบ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
