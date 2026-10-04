/**
 * Pull-to-refresh gesture handler for touch devices
 * Calls onRefresh when user pulls down beyond threshold
 */

export interface PullToRefreshOptions {
  threshold?: number // pixels to pull before triggering refresh (default: 80)
  onRefresh: () => Promise<void> | void
  getScrollElement: () => HTMLElement | null | undefined
}

export function setupPullToRefresh(options: PullToRefreshOptions) {
  const { threshold = 80, onRefresh, getScrollElement } = options

  let startY = 0
  let pulling = false
  let refreshing = false
  let container: HTMLElement | null = null

  function reset() {
    startY = 0
    pulling = false
    updateIndicator(0)
  }

  function updateIndicator(delta: number) {
    if (!container) return
    const progress = Math.min(delta / threshold, 1)
    container.style.setProperty('--ptr-progress', `${progress}`)
    container.style.setProperty('--ptr-y', `${Math.min(delta, threshold * 1.5)}px`)
  }

  function onTouchStart(e: TouchEvent) {
    if (refreshing) return
    const scrollEl = getScrollElement()
    if (!scrollEl || scrollEl.scrollTop > 0) return
    
    startY = e.touches[0].clientY
    pulling = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling || refreshing) return
    
    const scrollEl = getScrollElement()
    if (!scrollEl) return

    const currentY = e.touches[0].clientY
    const delta = currentY - startY

    // Only handle pull down (positive delta) when at the top
    if (delta > 0 && scrollEl.scrollTop <= 0) {
      // Add resistance as user pulls
      const resistance = 0.5
      const adjustedDelta = delta * resistance
      updateIndicator(adjustedDelta)
      
      // Prevent default scroll behavior
      if (delta > 10) {
        e.preventDefault()
      }
    } else {
      reset()
    }
  }

  function onTouchEnd() {
    if (!pulling || refreshing) return

    const scrollEl = getScrollElement()
    if (!scrollEl) {
      reset()
      return
    }

    const currentProgress = parseFloat(container?.style.getPropertyValue('--ptr-progress') || '0')
    
    if (currentProgress >= 1) {
      refreshing = true
      container?.classList.add('ptr-refreshing')
      container?.style.setProperty('--ptr-y', `${threshold}px`)
      
      Promise.resolve(onRefresh())
        .catch(() => undefined)
        .finally(() => {
          refreshing = false
          container?.classList.remove('ptr-refreshing')
          reset()
        })
    } else {
      reset()
    }

    pulling = false
  }

  function setContainer(el: HTMLElement | null) {
    container = el
    if (el) {
      el.addEventListener('touchstart', onTouchStart, { passive: true })
      el.addEventListener('touchmove', onTouchMove, { passive: false })
      el.addEventListener('touchend', onTouchEnd, { passive: true })
    }
  }

  function destroy() {
    if (container) {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }

  return { setContainer, destroy }
}
