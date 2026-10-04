/**
 * Pull-to-refresh gesture handler for touch devices
 * Uses Svelte action pattern for safe cleanup
 */

export interface PullToRefreshOptions {
  threshold?: number
  onRefresh: () => Promise<void> | void
}

export function pullToRefresh(node: HTMLElement, options: PullToRefreshOptions) {
  const threshold = options.threshold ?? 80
  const { onRefresh } = options

  // Only enable on touch devices
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  if (!isTouchDevice) {
    return { destroy: () => {} }
  }

  let startY = 0
  let pulling = false
  let refreshing = false

  // Create indicator element
  const indicator = document.createElement('div')
  indicator.className = 'ptr-indicator'
  indicator.setAttribute('aria-hidden', 'true')
  indicator.innerHTML = `
    <div class="ptr-spinner"></div>
  `
  node.style.position = 'relative'
  node.insertBefore(indicator, node.firstChild)

  function reset() {
    startY = 0
    pulling = false
    node.style.setProperty('--ptr-progress', '0')
    node.style.setProperty('--ptr-y', '0px')
    node.classList.remove('ptr-refreshing')
  }

  function findScrollElement(): HTMLElement | null {
    // Find the nearest scrollable element
    let el: HTMLElement | null = node
    while (el) {
      const style = window.getComputedStyle(el)
      if (
        (el.scrollTop > 0 || el.scrollLeft > 0) ||
        (style.overflowY === 'auto' || style.overflowY === 'scroll') ||
        (style.overflow === 'auto' || style.overflow === 'scroll')
      ) {
        if (el.scrollTop > 0) return el
        if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
          return el
        }
      }
      el = el.parentElement
    }
    return null
  }

  function onTouchStart(e: TouchEvent) {
    if (refreshing) return

    const scrollEl = findScrollElement()
    if (!scrollEl || scrollEl.scrollTop > 0) return

    startY = e.touches[0].clientY
    pulling = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling || refreshing) return

    const scrollEl = findScrollElement()
    if (!scrollEl) {
      reset()
      return
    }

    const currentY = e.touches[0].clientY
    const delta = currentY - startY

    // Only handle pull down (positive delta) when at the top
    if (delta > 0 && scrollEl.scrollTop <= 0) {
      // Add resistance as user pulls
      const resistance = 0.4
      const adjustedDelta = delta * resistance
      const progress = Math.min(adjustedDelta / threshold, 1)

      node.style.setProperty('--ptr-progress', `${progress}`)
      node.style.setProperty('--ptr-y', `${Math.min(adjustedDelta, threshold * 1.2)}px`)

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

    const progress = parseFloat(node.style.getPropertyValue('--ptr-progress') || '0')
    console.log('[PTR] onTouchEnd', { progress, threshold, willRefresh: progress >= 1 })

    if (progress >= 1) {
      refreshing = true
      pulling = false
      node.classList.add('ptr-refreshing')
      node.style.setProperty('--ptr-y', `${threshold}px`)
      node.style.setProperty('--ptr-progress', '1')

      console.log('[PTR] Calling onRefresh')
      Promise.resolve(onRefresh())
        .then(() => console.log('[PTR] onRefresh completed'))
        .catch((err) => console.error('[PTR] onRefresh error', err))
        .finally(() => {
          console.log('[PTR] Resetting')
          refreshing = false
          reset()
        })
    } else {
      reset()
    }

    pulling = false
  }

  node.addEventListener('touchstart', onTouchStart, { passive: true })
  node.addEventListener('touchmove', onTouchMove, { passive: false })
  node.addEventListener('touchend', onTouchEnd, { passive: true })

  return {
    destroy() {
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
      indicator.remove()
    }
  }
}
