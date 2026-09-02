import { useRef, useCallback, useState } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  dragOffset: number
  isDragging: boolean
}

export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 40,
): SwipeHandlers {
  const startX = useRef(0)
  const startY = useRef(0)
  const prevX = useRef(0)
  const velocity = useRef(0)
  const lastTime = useRef(0)
  const rafId = useRef(0)
  const pendingOffset = useRef(0)
  const dragging = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const flushRaf = useCallback(() => {
    setDragOffset(pendingOffset.current)
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (rafId.current) cancelAnimationFrame(rafId.current)
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    prevX.current = startX.current
    lastTime.current = performance.now()
    velocity.current = 0
    dragging.current = true
    setIsDragging(true)
    setDragOffset(0)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return
    const now = performance.now()
    const x = e.touches[0].clientX
    const dx = x - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (Math.abs(dx) > Math.abs(dy)) {
      const dt = now - lastTime.current
      if (dt > 0) velocity.current = (x - prevX.current) / dt
      prevX.current = x
      lastTime.current = now
      pendingOffset.current = dx
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = 0
          flushRaf()
        })
      }
    }
  }, [flushRaf])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
      rafId.current = 0
    }
    dragging.current = false
    setIsDragging(false)
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    const v = velocity.current
    const hasEnoughForce = Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) >= threshold || Math.abs(v) > 0.5)
    if (hasEnoughForce) {
      if (dx < 0 || v < -0.5) onSwipeLeft()
      else onSwipeRight()
    }
    setDragOffset(0)
  }, [onSwipeLeft, onSwipeRight, threshold])

  return { onTouchStart, onTouchMove, onTouchEnd, dragOffset, isDragging }
}
