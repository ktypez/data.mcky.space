class RoutePrefetcher {
  private cache = new Set<string>()
  private observers = new Map<string, IntersectionObserver>()
  
  observe(element: HTMLElement, route: string, callback: () => void) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.preloadRoute(route).then(callback)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '50px' }
    )
    
    observer.observe(element)
    this.observers.set(route, observer)
  }
  
  private async preloadRoute(route: string) {
    if (this.cache.has(route)) return
    
    try {
      // โหลดหน้า component
      switch (route) {
        case '/old':
          await import('@/pages/Clients')
          break
        case '/old/add':
          await import('@/pages/AddEditPage')
          break
        case '/old/trash':
          await import('@/pages/TrashPage')
          break
      }
      this.cache.add(route)
    } catch (error) {
      console.error(`Failed to preload ${route}:`, error)
    }
  }
  
  cleanup() {
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
  }
}

export const routePrefetcher = new RoutePrefetcher()