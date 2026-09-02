interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
}

class PerfMonitor {
  private metrics: PerformanceMetric[] = []
  private startTimes = new Map<string, number>()
  
  mark(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      this.startTimes.set(name, window.performance.now())
    }
  }
  
  measure(name: string, _endMark?: string) {
    try {
      if (typeof window !== 'undefined' && window.performance) {
        const start = this.startTimes.get(name)
        if (start !== undefined) {
          const duration = window.performance.now() - start
          this.recordMetric(name, duration)
          this.startTimes.delete(name)
        }
      }
    } catch (error) {
      console.warn(`Failed to measure ${name}:`, error)
    }
  }
  
  recordMetric(name: string, duration: number) {
    this.metrics.push({ name, duration, timestamp: Date.now() })
  }
  
  getAverage(name: string): number {
    const durations = this.metrics
      .filter(m => m.name === name)
      .map(m => m.duration)
    
    if (durations.length === 0) return 0
    return durations.reduce((a, b) => a + b, 0) / durations.length
  }
  
  logBundleSize() {
    if (typeof document !== 'undefined') {
      const scripts = document.querySelectorAll('script[src]')
      let totalSize = 0
      
      scripts.forEach((script: Element) => {
        const dataSize = (script as HTMLElement).getAttribute('data-size')
        if (dataSize) {
          const parsed = parseInt(dataSize, 10)
          if (!isNaN(parsed)) totalSize += parsed
        }
      })
      
      console.log(`Bundle size: ${(totalSize / 1024).toFixed(2)} KB`)
      
      // เตือน ถ้าหากใหญ่กว่า 500KB
      if (totalSize > 500 * 1024) {
        console.warn('Bundle size > 500KB - consider splitting')
      }
    }
  }
}

export const perfMonitor = new PerfMonitor()